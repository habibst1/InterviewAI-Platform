// PublicInterviewService.cs
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public class PublicInterviewService
{
    private readonly AppDbContext _db;
    private readonly IPythonAIService _pythonAI;
    private readonly ILogger<PublicInterviewService> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public PublicInterviewService(
        AppDbContext db,
        IPythonAIService pythonAI,
        ILogger<PublicInterviewService> logger,
        IServiceScopeFactory serviceScopeFactory)
    {
        _db = db;
        _pythonAI = pythonAI;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
    }

    public async Task<InterviewStartResponse> StartInterview(Guid userId, Guid domainId)
    {
        _logger.LogInformation("Starting interview for user {UserId} in domain {DomainId}", userId, domainId);
        try
        {
            // 1. Get domain with its configuration
            var domain = await _db.Domains
                .Include(d => d.Configuration)
                .FirstOrDefaultAsync(d => d.Id == domainId);

            if (domain == null)
                throw new ArgumentException($"Domain with ID {domainId} not found.");

            // 2. Validate inventory based on configuration
            await ValidateQuestionInventory(domainId, domain.Configuration);

            // 3. Get random questions based on configuration
            var questions = await GetRandomQuestionsByConfiguration(domainId, domain.Configuration);
            if (questions.Count == 0)
                throw new InvalidOperationException($"No questions available for domain: {domainId}");

            // 4. Process first question immediately
            var firstQuestion = questions[0];
            await EnsureQuestionAudio(firstQuestion);

            // 5. Create session
            var session = new InterviewSession
            {
                RegularUserId = userId,
                DomainId = domainId,
                Responses = questions.Select((q, index) => new InterviewResponse
                {
                    QuestionId = q.Id,
                    Order = index + 1
                }).ToList()
            };
            _db.InterviewSessions.Add(session);

            // 6. Increment Domain SessionCount
            domain.SessionCount += 1;

            // 7. Save changes
            await _db.SaveChangesAsync();

            // 8. Background processing for remaining questions
            _ = ProcessRemainingQuestionsAsync(questions);

            return new InterviewStartResponse(
                session.Id,
                ToQuestionDto(firstQuestion, 1, questions.Count),
                questions.Count
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start interview for user {UserId} in domain {DomainId}", userId, domainId);
            throw;
        }
    }

    private async Task<List<InterviewQuestion>> GetRandomQuestionsByConfiguration(Guid domainId, DomainConfiguration? config)
    {
        var questions = new List<InterviewQuestion>();

        // Use configuration values or defaults
        var questionsPerTier = new Dictionary<Difficulty, int>
        {
            { Difficulty.E, config?.QuestionsPerE ?? 0 },
            { Difficulty.D, config?.QuestionsPerD ?? 0 },
            { Difficulty.C, config?.QuestionsPerC ?? 0 },
            { Difficulty.B, config?.QuestionsPerB ?? 0 },
            { Difficulty.A, config?.QuestionsPerA ?? 0 }
        };

        foreach (var kvp in questionsPerTier)
        {
            var difficulty = kvp.Key;
            var count = kvp.Value;

            // Skip if count is 0
            if (count <= 0) continue;

            var tierQuestions = await _db.InterviewQuestions
                .Where(q => q.DomainId == domainId && q.Difficulty == difficulty)
                .OrderBy(q => EF.Functions.Random())
                .Take(count)
                .ToListAsync();

            questions.AddRange(tierQuestions);
        }

        return questions;
    }

    private async Task ValidateQuestionInventory(Guid domainId, DomainConfiguration? config)
    {
        // Use configuration values or defaults
        var requiredCounts = new Dictionary<Difficulty, int>
        {
            { Difficulty.E, config?.QuestionsPerE ?? 0 },
            { Difficulty.D, config?.QuestionsPerD ?? 0 },
            { Difficulty.C, config?.QuestionsPerC ?? 0 },
            { Difficulty.B, config?.QuestionsPerB ?? 0 },
            { Difficulty.A, config?.QuestionsPerA ?? 0 }
        };

        foreach (var kvp in requiredCounts)
        {
            var difficulty = kvp.Key;
            var requiredCount = kvp.Value;

            // Skip validation if count is 0
            if (requiredCount <= 0) continue;

            var count = await _db.InterviewQuestions
                .CountAsync(q => q.DomainId == domainId && q.Difficulty == difficulty);

            if (count < requiredCount)
                throw new InvalidOperationException(
                    $"Not enough questions for domain {domainId}/{difficulty}. Found {count}, required {requiredCount}.");
        }
    }

    private async Task EnsureQuestionAudio(InterviewQuestion question)
    {
        if (string.IsNullOrEmpty(question.AudioUrl))
        {
            question.AudioUrl = await _pythonAI.GenerateQuestionAudio(question.Text);
            await _db.SaveChangesAsync();
        }
    }

    private async Task ProcessRemainingQuestionsAsync(List<InterviewQuestion> questions)
    {
        if (questions.Count <= 1) return;

        using var scope = _serviceScopeFactory.CreateScope();
        var scopedDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        foreach (var question in questions.Skip(1))
        {
            try
            {
                if (string.IsNullOrEmpty(question.AudioUrl))
                {
                    var audioUrl = await _pythonAI.GenerateQuestionAudio(question.Text);

                    var trackedQuestion = await scopedDb.InterviewQuestions.FindAsync(question.Id);
                    if (trackedQuestion != null)
                    {
                        trackedQuestion.AudioUrl = audioUrl;
                        await scopedDb.SaveChangesAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate audio for question {QuestionId}", question.Id);
            }
        }
    }

    private static QuestionDto ToQuestionDto(InterviewQuestion q, int order, int totalQuestions) => new(
        order,
        q.Text,
        q.AudioUrl!,
        q.Difficulty,
        totalQuestions,
        order == totalQuestions
    );
}