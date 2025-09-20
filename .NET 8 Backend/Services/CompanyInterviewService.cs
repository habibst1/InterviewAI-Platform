using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Mail;
using System.Threading.Tasks;

public class CompanyInterviewService
{
    private readonly AppDbContext _db;
    private readonly IPythonAIService _pythonAI;
    private readonly IEmailService _emailService;
    private readonly ILogger<CompanyInterviewService> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CompanyInterviewService(
        AppDbContext db,
        IPythonAIService pythonAI,
        IEmailService emailService,
        ILogger<CompanyInterviewService> logger,
        IServiceScopeFactory serviceScopeFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _pythonAI = pythonAI;
        _emailService = emailService;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<CompanyInterview> CreateInterview(
        Guid companyId,
        string title,
        List<CompanyQuestionDto> questions,
        Dictionary<Difficulty, int> questionsPerTier,
        List<string> candidateEmails)
    {
        _logger.LogInformation("Creating company interview for company {CompanyId}", companyId);

        // Validate question counts
        foreach (var tier in questionsPerTier)
        {
            var count = questions.Count(q => q.Difficulty == tier.Key);
            if (count < tier.Value)
                throw new InvalidOperationException($"Not enough questions for {tier.Key}. Required: {tier.Value}, Provided: {count}");
        }

        // Validate candidate emails
        foreach (var email in candidateEmails)
        {
            if (!IsValidEmail(email))
                throw new InvalidOperationException($"Invalid email address: {email}");
        }

        // Select questions based on tier configuration
        var selectedQuestions = new List<CompanyInterviewQuestion>();
        var orderCounter = 1; // Order counter

        foreach (var tier in questionsPerTier)
        {
            var tierQuestions = questions
                .Where(q => q.Difficulty == tier.Key)
                .OrderBy(_ => Guid.NewGuid())
                .Take(tier.Value)
                .Select(q => new CompanyInterviewQuestion
                {
                    Text = q.Text,
                    IdealAnswer = q.IdealAnswer,
                    Difficulty = q.Difficulty,
                    Order = orderCounter++,
                })
                .ToList();
            selectedQuestions.AddRange(tierQuestions);
        }

        // Create interview
        var company = await _db.Companies.FindAsync(companyId);
        var interview = new CompanyInterview
        {
            CompanyId = companyId,
            Title = title,
            Questions = selectedQuestions,
            Invitations = candidateEmails.Select(email => new CandidateInvitation
            {
                CandidateEmail = email,
                UniqueLinkToken = Guid.NewGuid().ToString(),
                IsUsed = false
            }).ToList()
        };

        _db.CompanyInterviews.Add(interview);
        await _db.SaveChangesAsync();

        // Generate audio for questions in the background
        _ = ProcessCompanyQuestionsAudioAsync(interview.Id, selectedQuestions);

        // Send emails in the background
        _ = SendInvitationsAsync(interview.Id, company!.CompanyName, title, interview.Invitations);

        return interview;
    }

    public async Task<List<(string CandidateEmail, string UniqueLink , string UniqueLinkToken)>> InviteAdditionalCandidates(
        Guid companyId,
        Guid interviewId,
        List<string> candidateEmails)
    {
        _logger.LogInformation("Inviting additional candidates to interview {InterviewId} for company {CompanyId}", interviewId, companyId);

        // Validate interview
        var interview = await _db.CompanyInterviews
            .Include(i => i.Company)
            .Include(i => i.Invitations)
            .FirstOrDefaultAsync(i => i.Id == interviewId && i.CompanyId == companyId);
        if (interview == null)
            throw new InvalidOperationException("Interview not found or access denied");

        // Validate candidate emails
        if (!candidateEmails.Any())
            throw new InvalidOperationException("At least one candidate email is required");
        foreach (var email in candidateEmails)
        {
            if (!IsValidEmail(email))
                throw new InvalidOperationException($"Invalid email address: {email}");
            if (interview.Invitations.Any(i => i.CandidateEmail == email))
                throw new InvalidOperationException($"Candidate {email} is already invited to this interview");
        }

        // Create new invitations
        var newInvitations = candidateEmails.Select(email => new CandidateInvitation
        {
            CompanyInterviewId = interviewId,
            CandidateEmail = email,
            UniqueLinkToken = Guid.NewGuid().ToString(),
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        _db.CandidateInvitations.AddRange(newInvitations);
        await _db.SaveChangesAsync();

        // Generate links
        var request = _httpContextAccessor.HttpContext?.Request;
        if (request == null)
        {
            _logger.LogError("HttpContext is null, cannot generate invitation links");
            throw new InvalidOperationException("Cannot generate invitation links");
        }

        var links = newInvitations.Select(i => (
            CandidateEmail: i.CandidateEmail,
            UniqueLink: $"{request.Scheme}://{request.Host}/api/candidate-interview/start/{i.UniqueLinkToken}",
            UniqueLinkToken: i.UniqueLinkToken  // Add this line
        )).ToList();

        // Send emails in the background
        _ = SendInvitationsAsync(interviewId, interview.Company!.CompanyName, interview.Title, newInvitations);

        return links;
    }

    private async Task SendInvitationsAsync(Guid interviewId, string companyName, string interviewTitle, List<CandidateInvitation> invitations)
    {
        var request = _httpContextAccessor.HttpContext?.Request;
        if (request == null)
        {
            _logger.LogError("HttpContext is null, cannot generate invitation links");
            throw new InvalidOperationException("Cannot generate invitation links");
        }

        foreach (var invitation in invitations)
        {
            try
            {
                var link = $"http://localhost:5173/candidate-interview/{invitation.UniqueLinkToken}";
                await _emailService.SendInterviewInvitationAsync(
                    invitation.CandidateEmail,
                    companyName,
                    interviewTitle,
                    link);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send invitation to {CandidateEmail}", invitation.CandidateEmail);
            }
        }
    }

    private bool IsValidEmail(string email)
    {
        try
        {
            var addr = new MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    public async Task<List<CompanyInterviewResultDto>> GetInterviewResults(Guid companyId, Guid interviewId)
    {
        var interview = await _db.CompanyInterviews
            .Include(i => i.Sessions)
            .ThenInclude(s => s.Responses)
            .ThenInclude(r => r.Question)
            .FirstOrDefaultAsync(i => i.Id == interviewId && i.CompanyId == companyId);

        if (interview == null)
            throw new InvalidOperationException("Interview not found or access denied");

        // Retry incomplete evaluations
        foreach (var session in interview.Sessions)
        {
            var incompleteResponses = session.Responses.Where(r => r.Feedback == null && r.UserAudioUrl != null).ToList();
            foreach (var response in incompleteResponses)
            {
                try
                {
                    var eval = await _pythonAI.EvaluateResponse(
                        response.CompanyInterviewQuestionId,
                        response.Question!.Text,
                        response.Question!.IdealAnswer,
                        response.UserAudioUrl!);

                    response.Score = eval.Score;
                    response.Feedback = eval.Feedback;
                    response.UserAudioTranscribed = eval.Transcription;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to evaluate response {ResponseId}", response.Id);
                }
            }
        }
        await _db.SaveChangesAsync();

        return interview.Sessions.Select(s => new CompanyInterviewResultDto(
            s.Id,
            s.CandidateEmail,
            s.IsCompleted,
            s.AverageScore,
            s.Responses.Count
        )).ToList();
    }

    private async Task ProcessCompanyQuestionsAudioAsync(Guid interviewId, List<CompanyInterviewQuestion> questions)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var scopedDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        foreach (var question in questions)
        {
            if (string.IsNullOrEmpty(question.AudioUrl))
            {
                try
                {
                    var audioUrl = await _pythonAI.GenerateQuestionAudio(question.Text);
                    var trackedQuestion = await scopedDb.CompanyInterviewQuestions.FindAsync(question.Id);
                    if (trackedQuestion != null)
                    {
                        trackedQuestion.AudioUrl = audioUrl;
                        await scopedDb.SaveChangesAsync();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to generate audio for company question {QuestionId}", question.Id);
                }
            }
        }
    }


}