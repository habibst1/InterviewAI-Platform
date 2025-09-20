using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;


[ApiController]
[Route("api/interview")]
[Authorize(Policy = "RegularUserOnly")]
public class PublicInterviewController : ControllerBase
{
    private readonly ILogger<PublicInterviewController> _logger;
    private readonly AppDbContext _db;
    private readonly IPythonAIService _pythonAI;
    private readonly IStorageService _storage;
    private readonly PublicInterviewService _interviewService;
    private readonly ICurrentUserService _currentUser;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public PublicInterviewController(
        AppDbContext db,
        IPythonAIService pythonAI,
        IStorageService storage,
        PublicInterviewService interviewService,
        ICurrentUserService currentUser,
        ILogger<PublicInterviewController> logger,
        IServiceScopeFactory serviceScopeFactory)
    {
        _logger = logger;
        _db = db;
        _pythonAI = pythonAI;
        _storage = storage;
        _interviewService = interviewService;
        _currentUser = currentUser;
        _serviceScopeFactory = serviceScopeFactory;
    }

    [HttpGet("domains")]
    public async Task<IActionResult> GetDomains()
    {
        try
        {
            var domains = await _db.Domains
                .Select(d => new { d.Id, d.Name, d.CreatedAt, d.SessionCount, d.LogoUrl })
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} domains for user {UserId}.", domains.Count, _currentUser.UserId);
            return Ok(domains);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve domains for user {UserId}", _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving domains.",
                Code = "DOMAINS_RETRIEVAL_FAILED"
            });
        }
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartInterview([FromBody] StartRequest request)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid interview start data provided.",
                Code = "INVALID_START_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }

        _logger.LogInformation("Starting interview for user {UserId} in domain {DomainId}",
            _currentUser.UserId, request.DomainId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized user request lacks UserId. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            var result = await _interviewService.StartInterview(
                _currentUser.UserId.Value,
                request.DomainId);

            _logger.LogInformation("User {UserId} successfully started interview session {SessionId} in domain {DomainId}.",
                _currentUser.UserId, result.SessionId, request.DomainId);
            return Ok(result);
        }
        catch (ArgumentException ex) // Catch specific business logic errors from service
        {
            _logger.LogWarning(ex, "Invalid argument provided by user {UserId} during interview start for domain {DomainId}.", _currentUser.UserId, request.DomainId);
            return BadRequest(new ApiErrorResponse
            {
                Message = ex.Message, // Service provides user-friendly message
                Code = "INTERVIEW_START_ARGUMENT_ERROR"
            });
        }
        catch (InvalidOperationException ex) // Catch specific business logic errors from service (e.g., insufficient questions)
        {
            _logger.LogWarning(ex, "Business logic error for user {UserId} during interview start for domain {DomainId}.", _currentUser.UserId, request.DomainId);
            return BadRequest(new ApiErrorResponse
            {
                Message = ex.Message, // Service provides user-friendly message
                Code = "INTERVIEW_START_BUSINESS_ERROR"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start interview for user {UserId} in domain {DomainId}", _currentUser.UserId, request.DomainId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while starting the interview.",
                Code = "INTERVIEW_START_FAILED"
            });
        }
    }

    [HttpPost("submit-response")]
    public async Task<IActionResult> SubmitResponse([FromForm] SubmitResponseDto dto)
    {
        // Basic validation for the DTO (especially file)
        if (dto == null || dto.AudioResponse == null || dto.AudioResponse.Length == 0)
        {
            _logger.LogWarning("User {UserId} submitted response with missing or empty audio for session {SessionId}.", _currentUser.UserId, dto?.SessionId);
            return BadRequest(new ApiErrorResponse
            {
                Message = "Audio response is required.",
                Code = "MISSING_AUDIO_RESPONSE"
            });
        }

        _logger.LogInformation("Submitting response for session {SessionId} by user {UserId}", dto.SessionId, _currentUser.UserId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized user request lacks UserId during response submission. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            var session = await _db.InterviewSessions
                .Include(s => s.Responses)
                    .ThenInclude(r => r.Question)
                .FirstOrDefaultAsync(s => s.Id == dto.SessionId
                    && s.RegularUserId == _currentUser.UserId.Value);
            if (session == null)
            {
                _logger.LogWarning("User {UserId} attempted to submit response for non-existent or unauthorized session {SessionId}.", _currentUser.UserId, dto.SessionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Session not found or access denied.",
                    Code = "SESSION_NOT_FOUND"
                });
            }

            // Validate order
            var nextUnanswered = await _db.InterviewResponses
                .Where(r => r.SessionId == dto.SessionId
                    && r.UserAudioUrl == null)
                .OrderBy(r => r.Order)
                .FirstOrDefaultAsync();
            if (nextUnanswered == null)
            {
                _logger.LogWarning("User {UserId} attempted to submit response for session {SessionId} with no unanswered questions.", _currentUser.UserId, dto.SessionId);
                return BadRequest(new ApiErrorResponse
                {
                    Message = "All questions already answered.",
                    Code = "ALL_QUESTIONS_ANSWERED"
                });
            }

            if (nextUnanswered?.Order != dto.QuestionOrder)  // Frontend sends order (1, 2, 3...)
            {
                _logger.LogWarning("User {UserId} submitted response for session {SessionId} with incorrect order. Expected: {ExpectedOrder}, Got: {ProvidedOrder}.",
                    _currentUser.UserId, dto.SessionId, nextUnanswered?.Order, dto.QuestionOrder);
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Answer questions in order.",
                    Code = "QUESTION_ORDER_MISMATCH"
                });
            }

            // Save audio
            var audioUrl = await _storage.SaveAudio(dto.AudioResponse);
            nextUnanswered.UserAudioUrl = audioUrl;

            // Start background evaluation
            _ = Task.Run(async () =>
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var scopedDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var pythonAI = scope.ServiceProvider.GetRequiredService<IPythonAIService>();
                try
                {
                    var response = await scopedDb.InterviewResponses
                        .Include(r => r.Question)
                        .FirstOrDefaultAsync(r => r.Id == nextUnanswered.Id);
                    if (response != null && response.Question != null)
                    {
                        var eval = await pythonAI.EvaluateResponse(
                            response.QuestionId,
                            response.Question.Text,
                            response.Question.IdealAnswer,
                            audioUrl!);
                        response.Score = eval.Score;
                        response.Feedback = eval.Feedback;
                        response.UserAudioTranscribed = eval.Transcription;
                        await scopedDb.SaveChangesAsync();

                        _logger.LogDebug("Background evaluation completed for response {ResponseId} (Session {SessionId}).", response.Id, response.SessionId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background evaluation failed for response {ResponseId} (Session {SessionId})", nextUnanswered.Id, nextUnanswered.SessionId);
                    // Mark as failed to retry later - handled by the service logic in GetResults
                    // await scopedDb.SaveChangesAsync(); // Not needed here as we don't modify the failed response
                }
            });

            // Check if this was the last unanswered question
            bool allAnswered = session.Responses.All(r => r.UserAudioUrl != null);
            if (allAnswered)
            {
                session.IsCompleted = true;
                _logger.LogInformation("Interview session {SessionId} marked as completed for user {UserId}", session.Id, _currentUser.UserId);
            }
            await _db.SaveChangesAsync();

            _logger.LogInformation("Response successfully submitted for session {SessionId}, question order {QuestionOrder}, by user {UserId}.",
                dto.SessionId, dto.QuestionOrder, _currentUser.UserId);
            return Ok(); // Success response
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting response for session {SessionId} by user {UserId}", dto?.SessionId, _currentUser?.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while submitting your response.",
                Code = "RESPONSE_SUBMISSION_FAILED"
            });
        }
    }

    [HttpPost("next-question")]
    public async Task<IActionResult> GetQuestion([FromBody] NextQuestionRequest request)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid request data provided.",
                Code = "INVALID_NEXT_QUESTION_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }

        _logger.LogDebug("Fetching next unanswered question for session {SessionId} by user {UserId}", request.SessionId, _currentUser.UserId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized user request lacks UserId during next question fetch. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            var session = await _db.InterviewSessions
                .Include(s => s.Responses)
                    .ThenInclude(r => r.Question)
                .FirstOrDefaultAsync(s => s.Id == request.SessionId
                    && s.RegularUserId == _currentUser.UserId.Value); // Use .Value safely after check
            if (session == null)
            {
                _logger.LogWarning("User {UserId} requested next question for non-existent or unauthorized session {SessionId}.", _currentUser.UserId, request.SessionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Session not found or access denied.",
                    Code = "SESSION_NOT_FOUND"
                });
            }

            var nextResponse = await _db.InterviewResponses
                .Include(r => r.Question)
                .Where(r => r.SessionId == request.SessionId
                    && r.UserAudioUrl == null)
                .OrderBy(r => r.Order)  // Use Order consistently
                .FirstOrDefaultAsync();
            if (nextResponse?.Question == null)
            {
                _logger.LogInformation("No more unanswered questions found for session {SessionId} by user {UserId}.", request.SessionId, _currentUser.UserId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "No more questions to answer.",
                    Code = "NO_MORE_QUESTIONS"
                });
            }

            var totalQuestions = session.Responses.Count;
            var isLast = nextResponse.Order == totalQuestions;  // Use Order for this check

            _logger.LogDebug("Successfully retrieved next question (Order: {Order}) for session {SessionId} by user {UserId}.",
                nextResponse.Order, request.SessionId, _currentUser.UserId);

            return Ok(new QuestionDto(
                nextResponse.Order,  // Expose order
                nextResponse.Question.Text,
                nextResponse.Question.AudioUrl,
                nextResponse.Question.Difficulty,
                totalQuestions,
                isLast
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving next question for session {SessionId} by user {UserId}", request.SessionId, _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the question.",
                Code = "QUESTION_RETRIEVAL_FAILED"
            });
        }
    }

    /// <summary>
    /// Gets a list of interview sessions for the authenticated regular user.
    /// </summary>
    [HttpGet("sessions")] // Changed to GET and new route
    public async Task<IActionResult> GetMyInterviewSessions()
    {
        _logger.LogInformation("Fetching interview sessions for user {UserId}", _currentUser.UserId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized user request lacks UserId during session list fetch. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            var sessions = await _db.InterviewSessions
                .Where(s => s.RegularUserId == _currentUser.UserId.Value) // Filter by current user
                .Include(s => s.Domain)
                .Select(s => new // Project to a list DTO to avoid circular references and too much data
                {
                    s.Id,
                    s.StartedAt,
                    s.IsCompleted,
                    QuestionCount = s.Responses.Count,
                    CompletedResponsesCount = s.Responses.Count(r => r.UserAudioUrl != null),
                    DomainName = s.Domain != null ? s.Domain.Name : "Unknown Domain",
                    LogoUrl = s.Domain != null ? s.Domain.LogoUrl : null // Include LogoUrl from Domain
                })
                .ToListAsync();

            _logger.LogInformation("User {UserId} retrieved list of {Count} interview sessions.", _currentUser.UserId, sessions.Count);
            return Ok(sessions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve interview sessions for user {UserId}", _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving your interview sessions.",
                Code = "SESSIONS_RETRIEVAL_FAILED"
            });
        }
    }

    /// <summary>
    /// Gets the results for a specific completed interview session.
    /// </summary>
    [HttpGet("results/{sessionId:guid}")]
    public async Task<IActionResult> GetResults(Guid sessionId)
    {
        _logger.LogInformation("Fetching results for session {SessionId} by user {UserId}", sessionId, _currentUser.UserId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized user request lacks UserId during results fetch. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            // Ensure the session belongs to the current user
            var session = await _db.InterviewSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId
                    && s.RegularUserId == _currentUser.UserId.Value); // Use .Value safely after check
            if (session == null)
            {
                _logger.LogWarning("User {UserId} requested results for non-existent or unauthorized session {SessionId}.", _currentUser.UserId, sessionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Session not found or access denied.",
                    Code = "SESSION_NOT_FOUND"
                });
            }

            var responses = await _db.InterviewResponses
                .Include(r => r.Question)
                .Where(r => r.SessionId == sessionId && r.UserAudioUrl != null)
                .ToListAsync();

            // Check for incomplete evaluations and retry them
            var incompleteResponses = responses.Where(r => (r.Feedback == null)).ToList();
            if (incompleteResponses.Any())
            {
                _logger.LogInformation("Found {Count} incomplete evaluations for session {SessionId}, retrying...", incompleteResponses.Count, sessionId);
                foreach (var response in incompleteResponses)
                {
                    try
                    {
                        if (response.Question != null)
                        {
                            var eval = await _pythonAI.EvaluateResponse(
                                response.QuestionId,
                                response.Question.Text,
                                response.Question.IdealAnswer,
                                response.UserAudioUrl!);
                            response.Score = eval.Score;
                            response.Feedback = eval.Feedback;
                            response.UserAudioTranscribed = eval.Transcription;

                            _logger.LogDebug("Retried evaluation successful for response {ResponseId} (Session {SessionId}).", response.Id, sessionId);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to evaluate response {ResponseId} during retry for session {SessionId}", response.Id, sessionId);
                        // Leave as incomplete to retry next time
                    }
                }
                await _db.SaveChangesAsync(); // Save any retried evaluations
            }

            // Only return completed evaluations
            var completedEvaluations = responses
                .Where(r => (r.Feedback != null))
                .Select(r => new
                {
                    r.Order, // Include order for context
                    r.Score,
                    r.Feedback,
                    r.UserAudioTranscribed
                })
                .OrderBy(r => r.Order) // Order the results by question order
                .ToList();

            if (!completedEvaluations.Any())
            {
                _logger.LogInformation("Results for session {SessionId} are still being processed for user {UserId}.", sessionId, _currentUser.UserId);
                return Ok(new { Message = "Evaluations in progress, please check back later." });
            }

            var totalScore = completedEvaluations.Average(e => e.Score ?? 0);

            _logger.LogInformation("Successfully retrieved results for session {SessionId} by user {UserId}. Total Score: {TotalScore}",
                sessionId, _currentUser.UserId, totalScore);

            return Ok(new
            {
                SessionId = sessionId,
                TotalScore = totalScore,
                Breakdown = completedEvaluations,
                PendingEvaluations = responses.Count(r => (r.Feedback == null))
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving results for session {SessionId} by user {UserId}", sessionId, _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving your results.",
                Code = "RESULTS_RETRIEVAL_FAILED"
            });
        }
    }


    /// <summary>
    /// Deletes a specific interview session for the authenticated regular user.
    /// </summary>
    /// <param name="sessionId">The ID of the session to delete.</param>
    /// <returns>
    /// 204 NoContent: If the session was successfully deleted.
    /// 404 NotFound: If the session is not found or does not belong to the current user.
    /// 500 InternalServerError: If an unexpected error occurs during deletion.
    /// </returns>
    [HttpDelete("sessions/{sessionId:guid}")] // Route: DELETE /api/interview/sessions/{sessionId}
    public async Task<IActionResult> DeleteSession(Guid sessionId)
    {
        _logger.LogInformation("User {UserId} is attempting to delete session {SessionId}.", _currentUser.UserId, sessionId);

        try
        {
            // Ensure UserId is available from the context
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized user request lacks UserId during session deletion. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            // Find the session by ID and ensure it belongs to the current user
            var session = await _db.InterviewSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.RegularUserId == _currentUser.UserId.Value);

            // Check if session exists and belongs to the user
            if (session == null)
            {
                _logger.LogWarning("User {UserId} attempted to delete session {SessionId} which was not found or does not belong to them.", _currentUser.UserId, sessionId);
                // Return NotFound to prevent information leakage about existence of other users' sessions
                return NotFound(new ApiErrorResponse
                {
                    Message = "Session not found or access denied.",
                    Code = "SESSION_NOT_FOUND"
                });
            }

            // --- Perform Deletion ---
            _db.InterviewSessions.Remove(session);
            await _db.SaveChangesAsync();
            _logger.LogInformation("Session {SessionId} successfully deleted by user {UserId}.", sessionId, _currentUser.UserId);
            // Return 204 No Content as the standard response for successful deletion
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete session {SessionId} for user {UserId}", sessionId, _currentUser.UserId);
            // Return a generic server error response
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while deleting the session.",
                Code = "SESSION_DELETION_FAILED"
            });
        }
    }
}

// DTOs
public record StartRequest(Guid DomainId); // Guid is inherently validated by model binding
public record NextQuestionRequest(Guid SessionId); // Guid is inherently validated by model binding
  