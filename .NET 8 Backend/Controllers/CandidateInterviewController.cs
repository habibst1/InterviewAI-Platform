using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;


[ApiController]
[Route("api/candidate-interview")]
public class CandidateInterviewController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPythonAIService _pythonAI;
    private readonly IStorageService _storage;
    private readonly ILogger<CandidateInterviewController> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public CandidateInterviewController(
        AppDbContext db,
        IPythonAIService pythonAI,
        IStorageService storage,
        ILogger<CandidateInterviewController> logger,
        IServiceScopeFactory serviceScopeFactory)
    {
        _db = db;
        _pythonAI = pythonAI;
        _storage = storage;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
    }

    [HttpPost("start/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> StartCandidateInterview(string token, [FromBody] StartCandidateInterviewRequest request)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid interview start data provided.",
                Code = "INVALID_CANDIDATE_START_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }

        // 2. Business logic validation (basic)
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Candidate attempted to start interview with missing token.");
            return BadRequest(new ApiErrorResponse
            {
                Message = "Interview token is required.",
                Code = "MISSING_INTERVIEW_TOKEN"
            });
        }

        if (string.IsNullOrWhiteSpace(request?.CandidateEmail))
        {
            _logger.LogWarning("Candidate attempted to start interview with missing email. Token: {Token}", token);
            return BadRequest(new ApiErrorResponse
            {
                Message = "Candidate email is required.",
                Code = "MISSING_CANDIDATE_EMAIL"
            });
        }

        _logger.LogInformation("Starting candidate interview for token {Token}", token);

        try
        {
            var invitation = await _db.CandidateInvitations
                .Include(i => i.CompanyInterview)
                    .ThenInclude(ci => ci.Company) // Include Company
                .Include(i => i.CompanyInterview)
                    .ThenInclude(ci => ci.Questions) // Include Questions
                .FirstOrDefaultAsync(i => i.UniqueLinkToken == token && !i.IsUsed);

            if (invitation == null)
            {
                _logger.LogWarning("Candidate attempted to start interview with invalid or expired token: {Token}", token);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Invalid or expired interview link.",
                    Code = "INVALID_OR_EXPIRED_LINK"
                });
            }

            if (invitation.CandidateEmail != request.CandidateEmail)
            {
                _logger.LogWarning("Candidate email mismatch for token {Token}. Provided: {ProvidedEmail}, Expected: {ExpectedEmail}",
                    token, request.CandidateEmail, invitation.CandidateEmail);
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Email does not match the invitation.",
                    Code = "EMAIL_MISMATCH"
                });
            }

            // Create session with explicit ordering
            var session = new CompanyInterviewSession
            {
                CompanyInterviewId = invitation.CompanyInterviewId,
                CandidateEmail = request.CandidateEmail,
                Responses = invitation.CompanyInterview!.Questions
                    .OrderBy(q => q.Order)
                    .Select((q, index) => new CompanyInterviewResponse
                    {
                        CompanyInterviewQuestionId = q.Id,
                        Order = index + 1
                    }).ToList()
            };

            _db.CompanyInterviewSessions.Add(session);
            invitation.IsUsed = true;
            invitation.SessionId = session.Id;
            await _db.SaveChangesAsync();

            // Get first question using the same explicit order 
            var firstQuestion = invitation.CompanyInterview.Questions
                .OrderBy(q => q.Order)
                .First();
            
            _logger.LogInformation("Candidate interview started successfully. SessionId: {SessionId}, Token: {Token}", session.Id, token);

            return Ok(new CandidateStartDto(
                session.Id,
                invitation.CompanyInterview.Company.LogoUrl,
                1,
                firstQuestion.Text,
                firstQuestion.AudioUrl,
                firstQuestion.Difficulty,
                invitation.CompanyInterview.Questions.Count,
                invitation.CompanyInterview.Questions.Count == 1
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start candidate interview for token {Token}", token);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while starting the interview.",
                Code = "CANDIDATE_INTERVIEW_START_FAILED"
            });
        }
    }

    [HttpPost("submit-response")]
    [AllowAnonymous]
    public async Task<IActionResult> SubmitResponse([FromForm] CandidateSubmitResponseDto dto)
    {
        // Basic validation for the DTO (especially file)
        if (dto == null || dto.AudioResponse == null || dto.AudioResponse.Length == 0)
        {
            _logger.LogWarning("Candidate submitted response with missing or empty audio for session {SessionId}.", dto?.SessionId);
            return BadRequest(new ApiErrorResponse
            {
                Message = "Audio response is required.",
                Code = "MISSING_CANDIDATE_AUDIO_RESPONSE"
            });
        }

        _logger.LogInformation("Submitting response for candidate session {SessionId}", dto.SessionId);

        try
        {
            var session = await _db.CompanyInterviewSessions
                .Include(s => s.Responses)
                    .ThenInclude(r => r.Question)
                .FirstOrDefaultAsync(s => s.Id == dto.SessionId);

            if (session == null)
            {
                _logger.LogWarning("Candidate submitted response for non-existent session {SessionId}.", dto.SessionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Session not found.",
                    Code = "CANDIDATE_SESSION_NOT_FOUND"
                });
            }

            var invitation = await _db.CandidateInvitations
                .FirstOrDefaultAsync(i => i.SessionId == dto.SessionId);

            // Validate invitation exists and email matches session (security check)
            if (invitation == null || invitation.CandidateEmail != session.CandidateEmail)
            {
                _logger.LogWarning("Invalid session or email mismatch for session {SessionId}. Invitation exists: {InvExists}, Email match: {EmailMatch}",
                    dto.SessionId, invitation != null, invitation != null && invitation.CandidateEmail == session.CandidateEmail);
                // Return generic error to prevent information leakage
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Invalid session or access denied.",
                    Code = "CANDIDATE_SESSION_ACCESS_DENIED"
                });
            }

            var nextUnanswered = session.Responses
                .Where(r => r.UserAudioUrl == null)
                .OrderBy(r => r.Order)
                .FirstOrDefault();

            if (nextUnanswered == null)
            {
                _logger.LogWarning("Candidate attempted to submit response for session {SessionId} with no unanswered questions.", dto.SessionId);
                return BadRequest(new ApiErrorResponse
                {
                    Message = "All questions already answered.",
                    Code = "ALL_CANDIDATE_QUESTIONS_ANSWERED"
                });
            }

            if (nextUnanswered.Order != dto.QuestionOrder)
            {
                _logger.LogWarning("Candidate submitted response for session {SessionId} with incorrect order. Expected: {ExpectedOrder}, Got: {ProvidedOrder}.",
                    dto.SessionId, nextUnanswered.Order, dto.QuestionOrder);
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Answer questions in order.",
                    Code = "CANDIDATE_QUESTION_ORDER_MISMATCH"
                });
            }

            // Save audio
            var audioUrl = await _storage.SaveAudio(dto.AudioResponse);
            nextUnanswered.UserAudioUrl = audioUrl;

            // Check if this is the last question
            bool allAnswered = session.Responses.All(r => r.UserAudioUrl != null);
            if (allAnswered)
            {
                session.IsCompleted = true;
                _logger.LogInformation("Candidate session {SessionId} marked as completed", session.Id);
            }

            // Always save changes first
            await _db.SaveChangesAsync();

            // Start background evaluation - this will handle AverageScore calculation
            _ = Task.Run(async () =>
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var scopedDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var pythonAI = scope.ServiceProvider.GetRequiredService<IPythonAIService>();

                try
                {
                    // --- Evaluate the current response ---
                    var response = await scopedDb.CompanyInterviewResponses
                        .Include(r => r.Question)
                        .FirstOrDefaultAsync(r => r.Id == nextUnanswered.Id);

                    bool responseEvaluated = false;
                    if (response != null && response.Question != null)
                    {
                        var eval = await pythonAI.EvaluateResponse(
                            response.CompanyInterviewQuestionId,
                            response.Question.Text,
                            response.Question.IdealAnswer,
                            audioUrl!);

                        response.Score = eval.Score;
                        response.Feedback = eval.Feedback;
                        response.UserAudioTranscribed = eval.Transcription;
                        responseEvaluated = true;
                        _logger.LogDebug("Background evaluation completed for candidate response {ResponseId} (Session {SessionId}).", response.Id, response.SessionId);
                    }

                    // Save the evaluation result
                    if (responseEvaluated)
                        await scopedDb.SaveChangesAsync();

                    // --- Check if this was the last response to be evaluated ---
                    if (response != null && response.SessionId != Guid.Empty)
                    {
                        // Reload session with responses to check completion and scores
                        var sessionCheck = await scopedDb.CompanyInterviewSessions
                             .Include(s => s.Responses)
                             .AsNoTracking()
                             .FirstOrDefaultAsync(s => s.Id == response.SessionId);

                        if (sessionCheck != null && sessionCheck.IsCompleted)
                        {
                            // Check if all responses that have audio also have scores (evaluated)
                            var totalAnswered = sessionCheck.Responses.Count(r => r.UserAudioUrl != null);
                            var evaluatedResponses = sessionCheck.Responses
                                .Where(r => r.UserAudioUrl != null && r.Score.HasValue)
                                .ToList();

                            // If all answered questions are evaluated, calculate and update average
                            if (evaluatedResponses.Count == totalAnswered && totalAnswered > 0)
                            {
                                // Now load the tracked session entity for update
                                var trackedSession = await scopedDb.CompanyInterviewSessions.FindAsync(sessionCheck.Id);
                                if (trackedSession != null)
                                {
                                    var newAverageScore = evaluatedResponses.Average(r => r.Score!.Value);
                                    trackedSession.AverageScore = newAverageScore;
                                    await scopedDb.SaveChangesAsync();
                                    _logger.LogInformation("Calculated and updated AverageScore for session {SessionId}: {AverageScore}", trackedSession.Id, newAverageScore);
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background task failed for candidate response {ResponseId} (Session {SessionId})", nextUnanswered?.Id, nextUnanswered?.SessionId);
                }
            });

            _logger.LogInformation("Candidate response successfully submitted for session {SessionId}, question order {QuestionOrder}.",
                dto.SessionId, dto.QuestionOrder);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting candidate response for session {SessionId}", dto?.SessionId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while submitting your response.",
                Code = "CANDIDATE_RESPONSE_SUBMISSION_FAILED"
            });
        }
    }

    [HttpPost("next-question")]
    [AllowAnonymous]
    public async Task<IActionResult> GetNextQuestion([FromBody] NextCandidateQuestionRequest request)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid request data provided.",
                Code = "INVALID_CANDIDATE_NEXT_QUESTION_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }

        _logger.LogDebug("Fetching next question for candidate session {SessionId}", request.SessionId);

        try
        {
            var session = await _db.CompanyInterviewSessions
                .Include(s => s.Responses)
                    .ThenInclude(r => r.Question)
                .FirstOrDefaultAsync(s => s.Id == request.SessionId);

            if (session == null)
            {
                _logger.LogWarning("Candidate requested next question for non-existent session {SessionId}.", request.SessionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Session not found.",
                    Code = "CANDIDATE_SESSION_NOT_FOUND"
                });
            }

            var invitation = await _db.CandidateInvitations
                .FirstOrDefaultAsync(i => i.SessionId == request.SessionId);

            // Validate invitation exists and email matches session (security check)
            if (invitation == null || invitation.CandidateEmail != session.CandidateEmail)
            {
                _logger.LogWarning("Invalid session or email mismatch when fetching next question for session {SessionId}.", request.SessionId);
                // Return generic error to prevent information leakage
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Invalid session or access denied.",
                    Code = "CANDIDATE_SESSION_ACCESS_DENIED"
                });
            }

            var nextResponse = session.Responses
                .Where(r => r.UserAudioUrl == null)
                .OrderBy(r => r.Order)
                .FirstOrDefault();

            if (nextResponse?.Question == null)
            {
                _logger.LogInformation("No more unanswered questions found for candidate session {SessionId}.", request.SessionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "No more questions to answer.",
                    Code = "NO_MORE_CANDIDATE_QUESTIONS"
                });
            }

            var totalQuestions = session.Responses.Count;
            var isLast = nextResponse.Order == totalQuestions;

            _logger.LogDebug("Successfully retrieved next candidate question (Order: {Order}) for session {SessionId}.",
                nextResponse.Order, request.SessionId);
            return Ok(new CandidateQuestionDto(
                session.Id,
                nextResponse.Order,
                nextResponse.Question.Text,
                nextResponse.Question.AudioUrl,
                nextResponse.Question.Difficulty,
                totalQuestions,
                isLast
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving candidate question for session {SessionId}", request.SessionId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the question.",
                Code = "CANDIDATE_QUESTION_RETRIEVAL_FAILED"
            });
        }
    }
}

// DTOs (Ensure they have validation attributes if needed)
public record StartCandidateInterviewRequest([Required] string CandidateEmail); 
public record NextCandidateQuestionRequest([Required] Guid SessionId);
public record CandidateSubmitResponseDto(Guid SessionId, int QuestionOrder, IFormFile AudioResponse);
public record CandidateQuestionDto(Guid SessionId, int Order, string Text, string? AudioUrl, Difficulty Difficulty, int TotalQuestions, bool IsLast);
public record CandidateStartDto(Guid SessionId, string? LogoUrl, int Order, string Text, string? AudioUrl, Difficulty Difficulty, int TotalQuestions, bool IsLast);