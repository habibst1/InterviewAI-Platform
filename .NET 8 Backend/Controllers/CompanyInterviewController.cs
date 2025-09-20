using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using System.Linq; 
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic; 



[ApiController]
[Route("api/company-interview")]
[Authorize(Policy = "CompanyOnly")]
public class CompanyInterviewController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPythonAIService _pythonAI;
    private readonly IStorageService _storage;
    private readonly CompanyInterviewService _companyInterviewService;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<CompanyInterviewController> _logger;

    public CompanyInterviewController(
        AppDbContext db,
        IPythonAIService pythonAI,
        IStorageService storage,
        CompanyInterviewService companyInterviewService,
        ICurrentUserService currentUser,
        ILogger<CompanyInterviewController> logger)
    {
        _db = db;
        _pythonAI = pythonAI;
        _storage = storage;
        _companyInterviewService = companyInterviewService;
        _currentUser = currentUser;
        _logger = logger;
    }


    [HttpPost("create")]
    public async Task<IActionResult> CreateInterview([FromBody] CreateCompanyInterviewRequest request)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid interview creation data provided.",
                Code = "INVALID_INTERVIEW_CREATION_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }

        _logger.LogInformation("Company {CompanyId} is creating a new interview.", _currentUser.UserId);

        try
        {
            // Ensure UserId is available (should be guaranteed by Authorize)
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized company request lacks UserId. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            var interview = await _companyInterviewService.CreateInterview(
                _currentUser.UserId.Value,
                request.Title,
                request.Questions,
                request.QuestionsPerTier,
                request.CandidateEmails);

            // Map invitations to link DTOs
            var links = interview.Invitations.Select(i => new
            {
                CandidateEmail = i.CandidateEmail,
                UniqueLink = GenerateInterviewLink(i.UniqueLinkToken)
            }).ToList();

            _logger.LogInformation("Company {CompanyId} successfully created interview {InterviewId} with {LinkCount} invitation links.",
                _currentUser.UserId, interview.Id, links.Count);

            // Return success DTO
            return Ok(new
            {
                Message = "Interview created successfully.",
                InterviewId = interview.Id,
                Title = interview.Title,
                Links = links
            });
        }
        catch (ArgumentException ex) // Catch specific business logic errors from service
        {
             _logger.LogWarning(ex, "Invalid argument provided by company {CompanyId} during interview creation.", _currentUser.UserId);
             return BadRequest(new ApiErrorResponse
             {
                 Message = ex.Message, // Service provides user-friendly message
                 Code = "INTERVIEW_CREATION_ARGUMENT_ERROR"
             });
        }
        catch (InvalidOperationException ex) // Catch specific business logic errors from service (e.g., insufficient questions)
        {
            _logger.LogWarning(ex, "Business logic error for company {CompanyId} during interview creation.", _currentUser.UserId);
            return BadRequest(new ApiErrorResponse
            {
                Message = ex.Message, // Service provides user-friendly message
                Code = "INTERVIEW_CREATION_BUSINESS_ERROR"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create company interview for company {CompanyId}", _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while creating the interview.",
                Code = "INTERVIEW_CREATION_FAILED"
            });
        }
    }

    [HttpPost("{interviewId}/invite")]
    public async Task<IActionResult> InviteCandidates(Guid interviewId, [FromBody] InviteCandidatesRequest request)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid candidate invitation data provided.",
                Code = "INVALID_INVITATION_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }

        // 2. Business logic validation (basic)
        if (request.CandidateEmails == null || !request.CandidateEmails.Any())
        {
             _logger.LogWarning("Company {CompanyId} attempted to invite candidates with empty list for interview {InterviewId}.", _currentUser.UserId, interviewId);
             return BadRequest(new ApiErrorResponse
             {
                 Message = "Candidate email list cannot be empty.",
                 Code = "EMPTY_CANDIDATE_LIST"
             });
        }

        _logger.LogInformation("Company {CompanyId} is inviting candidates to interview {InterviewId}.", _currentUser.UserId, interviewId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                 _logger.LogError("Authorized company request lacks UserId during invitation. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                 return StatusCode(500, new ApiErrorResponse
                 {
                     Message = "User identification failed.",
                     Code = "USER_ID_MISSING"
                 });
            }

            var links = await _companyInterviewService.InviteAdditionalCandidates(
                _currentUser.UserId.Value,
                interviewId,
                request.CandidateEmails);

            // Map to response DTO
            var responseLinks = links.Select(l => new
            {
                CandidateEmail = l.CandidateEmail,
                UniqueLink = l.UniqueLink,
                UniqueLinkToken = l.UniqueLinkToken  // Add this line
            }).ToList();

            _logger.LogInformation("Company {CompanyId} successfully invited {LinkCount} candidates to interview {InterviewId}.",
                _currentUser.UserId, responseLinks.Count, interviewId);

            // Return success DTO
            return Ok(new
            {
                Message = "Candidates invited successfully.",
                InterviewId = interviewId,
                Links = responseLinks
            });
        }
        catch (UnauthorizedAccessException ex) // If service throws this for ownership issues
        {
             _logger.LogWarning(ex, "Company {CompanyId} attempted to invite candidates to interview {InterviewId} they do not own.", _currentUser.UserId, interviewId);
            // Correct
            return StatusCode(403, new ApiErrorResponse // 403 Forbidden with custom body
            {
                Message = "Access denied to the specified interview.",
                Code = "INTERVIEW_ACCESS_DENIED"
            });
        }
        catch (ArgumentException ex) // Catch specific business logic errors from service (e.g., invalid email format handled by service)
        {
             _logger.LogWarning(ex, "Invalid argument provided by company {CompanyId} during candidate invitation for interview {InterviewId}.", _currentUser.UserId, interviewId);
             return BadRequest(new ApiErrorResponse
             {
                 Message = ex.Message, // Service provides user-friendly message
                 Code = "INVITATION_ARGUMENT_ERROR"
             });
        }
        catch (InvalidOperationException ex) // Catch specific business logic errors from service (e.g., interview inactive)
        {
            _logger.LogWarning(ex, "Business logic error for company {CompanyId} during candidate invitation for interview {InterviewId}.", _currentUser.UserId, interviewId);
            return BadRequest(new ApiErrorResponse
            {
                Message = ex.Message, // Service provides user-friendly message
                Code = "INVITATION_BUSINESS_ERROR"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to invite candidates to interview {InterviewId} for company {CompanyId}", interviewId, _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while inviting candidates.",
                Code = "CANDIDATE_INVITATION_FAILED"
            });
        }
    }

    /// <summary>
    /// Finishes (deactivates) a specific company interview.
    /// Sets IsActive to false. Companies can only finish their own interviews.
    /// </summary>
    /// <param name="interviewId">The ID of the interview to finish.</param>
    /// <returns>204 NoContent on success, 404 if not found or access denied, 400 if already finished, 500 on error.</returns>
    [HttpPost("{interviewId:guid}/finish")]
    public async Task<IActionResult> FinishInterview(Guid interviewId)
    {
        _logger.LogInformation("Company {CompanyId} is attempting to finish interview {InterviewId}.", _currentUser.UserId, interviewId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized company request lacks UserId during interview finish. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            // Find the interview, ensuring it belongs to the current company
            var interview = await _db.CompanyInterviews
                .FirstOrDefaultAsync(ci => ci.Id == interviewId && ci.CompanyId == _currentUser.UserId.Value);

            if (interview == null)
            {
                _logger.LogWarning("Company {CompanyId} attempted to finish non-existent or unauthorized interview {InterviewId}.", _currentUser.UserId, interviewId);
                // Use NotFound to prevent leaking information about existence of other companies' interviews
                return NotFound(new ApiErrorResponse
                {
                    Message = "Interview not found or access denied.",
                    Code = "INTERVIEW_NOT_FOUND"
                });
            }

            if (!interview.IsActive)
            {
                _logger.LogInformation("Company {CompanyId} attempted to finish already inactive interview {InterviewId}.", _currentUser.UserId, interviewId);
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Interview is already finished.",
                    Code = "INTERVIEW_ALREADY_FINISHED"
                });
            }

            // Update the IsActive flag
            interview.IsActive = false;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Company {CompanyId} successfully finished interview {InterviewId}.", _currentUser.UserId, interviewId);
            // Return 204 No Content as the operation is successful and there's no specific data to return
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to finish interview {InterviewId} for company {CompanyId}", interviewId, _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while finishing the interview.",
                Code = "INTERVIEW_FINISH_FAILED"
            });
        }
    }

    [HttpGet("results/{interviewId}")]
    public async Task<IActionResult> GetInterviewResults(Guid interviewId)
    {
        _logger.LogInformation("Company {CompanyId} is requesting results for interview {InterviewId}.", _currentUser.UserId, interviewId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized company request lacks UserId during results fetch. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            // Get saved candidates for this company and interview to check which sessions are saved
            // Key: SessionId, Value: SavedCandidate record (which contains the SavedCandidateId)
            var savedCandidatesDict = await _db.SavedCandidates
                .Where(sc => sc.CompanyId == _currentUser.UserId.Value)
                .ToDictionaryAsync(sc => sc.SessionId, sc => sc);

            var results = await _companyInterviewService.GetInterviewResults(_currentUser.UserId.Value, interviewId);

            // Check if results were found (service might return null/empty or throw)
            // If service throws UnauthorizedAccessException or similar for not found/ownership, catch below
            if (results == null)
            {
                _logger.LogWarning("No results found for interview {InterviewId} for company {CompanyId} (or access denied).", interviewId, _currentUser.UserId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Interview results not found.",
                    Code = "INTERVIEW_RESULTS_NOT_FOUND"
                });
            }

            _logger.LogInformation("Company {CompanyId} successfully retrieved results for interview {InterviewId}.", _currentUser.UserId, interviewId);


            // Add saved status information to each result DTO
            var resultsWithSavedInfo = results.Select(result =>
            {
                var sessionId = result.SessionId;
                var isSavedInfo = savedCandidatesDict.TryGetValue(sessionId, out var savedInfo);

                // Return an anonymous object that includes all properties from the original DTO plus saved info
                return new
                {
                    SessionId = result.SessionId,
                    CandidateEmail = result.CandidateEmail,
                    IsCompleted = result.IsCompleted,
                    AverageScore = result.AverageScore,
                    ResponseCount = result.ResponseCount,
                    // Add saved info
                    IsSaved = isSavedInfo, // This will be true if a SavedCandidate record was found
                    SavedCandidateId = isSavedInfo ? savedInfo.Id : (Guid?)null // Get the actual ID if saved
                };
            }).ToList();

            _logger.LogInformation("Company {CompanyId} successfully retrieved results for interview {InterviewId}.", _currentUser.UserId, interviewId);
            // Return the modified results with saved info
            return Ok(resultsWithSavedInfo);
        }
        catch (UnauthorizedAccessException ex) // If service throws this for ownership issues or not found
        {
            _logger.LogWarning(ex, "Company {CompanyId} attempted to access results for interview {InterviewId} they do not own or that doesn't exist.", _currentUser.UserId, interviewId);
            return StatusCode(403, new ApiErrorResponse // 403 Forbidden with custom body
            {
                Message = "Access denied to the specified interview.",
                Code = "INTERVIEW_ACCESS_DENIED"
            });
        }
        catch (ArgumentException ex) // e.g., invalid Guid format passed
        {
            _logger.LogWarning(ex, "Invalid argument provided by company {CompanyId} when requesting results for interview {InterviewId}.", _currentUser.UserId, interviewId);
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid request parameters.",
                Code = "RESULTS_INVALID_ARGUMENT"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve interview results for interview {InterviewId} for company {CompanyId}", interviewId, _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while retrieving interview results.",
                Code = "INTERVIEW_RESULTS_RETRIEVAL_FAILED"
            });
        }
    }


    /// <summary>
    /// Gets a list of company interviews created by the authenticated company.
    /// </summary>
    [HttpGet("list")]
    public async Task<IActionResult> GetCompanyInterviews()
    {
        _logger.LogInformation("Fetching list of interviews for company {CompanyId}", _currentUser.UserId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                 _logger.LogError("Authorized company request lacks UserId during list fetch. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                 return StatusCode(500, new ApiErrorResponse
                 {
                     Message = "User identification failed.",
                     Code = "USER_ID_MISSING"
                 });
            }

            var interviews = await _db.CompanyInterviews
                .Where(ci => ci.CompanyId == _currentUser.UserId.Value) // Filter by current company
                .Select(ci => new // Project to a list DTO, avoiding circular references
                {
                    ci.Id,
                    ci.Title,
                    ci.IsActive,
                    ci.CreatedAt,
                    QuestionCount = ci.Questions.Count,
                    SessionCount = ci.Sessions.Count,
                    InvitationCount = ci.Invitations.Count
                })
                .ToListAsync();

            _logger.LogInformation("Company {CompanyId} retrieved list of {Count} interviews.", _currentUser.UserId, interviews.Count);
            return Ok(interviews);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve company interview list for company {CompanyId}", _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the interview list.",
                Code = "INTERVIEW_LIST_RETRIEVAL_FAILED"
            });
        }
    }

    /// <summary>
    /// Gets the details of a specific company interview by ID.
    /// </summary>
    [HttpGet("{interviewId:guid}")] // Specify guid type constraint
    public async Task<IActionResult> GetCompanyInterview(Guid interviewId)
    {
        _logger.LogInformation("Fetching details for company interview {InterviewId} for company {CompanyId}", interviewId, _currentUser.UserId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                 _logger.LogError("Authorized company request lacks UserId during interview details fetch. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                 return StatusCode(500, new ApiErrorResponse
                 {
                     Message = "User identification failed.",
                     Code = "USER_ID_MISSING"
                 });
            }

            var interview = await _db.CompanyInterviews
                .Include(ci => ci.Questions) // Include questions
                .Include(ci => ci.Invitations) // Include Invitations
                .Where(ci => ci.Id == interviewId && ci.CompanyId == _currentUser.UserId.Value) // Ensure ownership
                .Select(ci => new // Project to a detail DTO
                {
                    ci.Id,
                    ci.Title,
                    ci.IsActive,
                    ci.CreatedAt,
                    Questions = ci.Questions.Select(q => new
                    {
                        q.Id,
                        q.Text,
                        q.IdealAnswer,
                        q.Difficulty,
                        q.Order,
                        q.AudioUrl
                    }).ToList(),
                    InvitedCandidates = ci.Invitations.Select(inv => new
                    {
                        inv.CandidateEmail,
                        inv.IsUsed,
                        UniqueLinkToken = inv.UniqueLinkToken 
                    }).ToList()
                })
                .FirstOrDefaultAsync();

            if (interview == null)
            {
                _logger.LogWarning("Company {CompanyId} requested non-existent or unauthorized interview {InterviewId}.", _currentUser.UserId, interviewId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Company interview not found or access denied.",
                    Code = "INTERVIEW_NOT_FOUND"
                });
            }

            _logger.LogInformation("Company {CompanyId} retrieved details for interview {InterviewId}.", _currentUser.UserId, interviewId);
            return Ok(interview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve company interview {InterviewId}", interviewId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the interview details.",
                Code = "INTERVIEW_DETAILS_RETRIEVAL_FAILED"
            });
        }
    }


    /// <summary>
    /// Gets the details of a specific company interview session by ID.
    /// </summary>
    [HttpGet("session/{sessionId:guid}")] // Specify guid type constraint
    public async Task<IActionResult> GetCompanyInterviewSession(Guid sessionId)
    {
        _logger.LogInformation("Fetching details for company interview session {SessionId} for company", sessionId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                 _logger.LogError("Authorized company request lacks UserId during session details fetch. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                 return StatusCode(500, new ApiErrorResponse
                 {
                     Message = "User identification failed.",
                     Code = "USER_ID_MISSING"
                 });
            }

            // Check if this specific session is saved by the current company
            var savedCandidateRecord = await _db.SavedCandidates
                .FirstOrDefaultAsync(sc => sc.SessionId == sessionId && sc.CompanyId == _currentUser.UserId.Value);

            var isSaved = savedCandidateRecord != null;
            var savedCandidateId = savedCandidateRecord?.Id;

            // Need to join through CompanyInterview to verify company ownership
            var session = await _db.CompanyInterviewSessions
                .Include(s => s.CompanyInterview)
                .Include(s => s.Responses)
                    .ThenInclude(r => r.Question)
                .Where(s => s.Id == sessionId &&
                            s.CompanyInterview != null &&
                            s.CompanyInterview.CompanyId == _currentUser.UserId.Value)
                .Select(s => new
                {
                    s.Id,
                    s.CandidateEmail,
                    s.StartedAt,
                    s.IsCompleted,
                    s.AverageScore,
                    InterviewTitle = s.CompanyInterview.Title,
                    Responses = s.Responses.Select(r => new
                    {
                        r.Order,
                        QuestionText = r.Question != null ? r.Question.Text : "N/A",
                        r.UserAudioUrl,
                        r.UserAudioTranscribed,
                        r.Feedback,
                        r.Score
                    }).OrderBy(r => r.Order).ToList(),
                    // Include the saved status information
                    IsSaved = isSaved,
                    SavedCandidateId = savedCandidateId
                })
                .FirstOrDefaultAsync();

            if (session == null)
            {
                _logger.LogWarning("Company {CompanyId} requested non-existent or unauthorized session {SessionId}.", _currentUser.UserId, sessionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Company interview session not found or access denied.",
                    Code = "SESSION_NOT_FOUND"
                });
            }

            _logger.LogInformation("Company {CompanyId} retrieved details for session {SessionId}.", _currentUser.UserId, sessionId);

            return Ok(session);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve company interview session {SessionId}", sessionId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the session details.",
                Code = "SESSION_DETAILS_RETRIEVAL_FAILED"
            });
        }
    }


    /// <summary>
    /// Deletes a specific company interview and all related entities.
    /// Companies can only delete their own interviews.
    /// </summary>
    /// <param name="interviewId">The ID of the interview to delete.</param>
    /// <returns>204 NoContent on success, 404 if not found or access denied, 500 on error.</returns>
    [HttpDelete("{interviewId:guid}")] 
    public async Task<IActionResult> DeleteInterview(Guid interviewId)
    {
        _logger.LogInformation("Company {CompanyId} is attempting to delete interview {InterviewId}.", _currentUser.UserId, interviewId);

        try
        {
            // Ensure UserId is available
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized company request lacks UserId during interview deletion. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            // --- Find the interview WITH related entities ---
            var interview = await _db.CompanyInterviews
                .Include(ci => ci.Questions) // Include questions
                .Include(ci => ci.Invitations) // Include invitations
                .Include(ci => ci.Sessions)
                    .ThenInclude(s => s.Responses) // Include responses within sessions
                .Where(ci => ci.Id == interviewId && ci.CompanyId == _currentUser.UserId.Value) // Ensure ownership
                .FirstOrDefaultAsync(); // Use FirstOrDefaultAsync

            if (interview == null)
            {
                _logger.LogWarning("Company {CompanyId} attempted to delete non-existent or unauthorized interview {InterviewId}.", _currentUser.UserId, interviewId);
                // Use NotFound to prevent leaking information about existence of other companies' interviews
                return NotFound(new ApiErrorResponse
                {
                    Message = "Interview not found or access denied.",
                    Code = "INTERVIEW_NOT_FOUND"
                });
            }


            // --- Explicitly remove related entities in correct order ---
            // 1. Remove Responses (dependent on Sessions and Questions)
            if (interview.Sessions != null && interview.Sessions.Any())
            {
                foreach (var session in interview.Sessions)
                {
                    if (session.Responses != null)
                    {
                        _db.CompanyInterviewResponses.RemoveRange(session.Responses);
                    }
                }
            }

            // 2. Remove Questions (dependent on Interview)
            if (interview.Questions != null)
            {
                _db.CompanyInterviewQuestions.RemoveRange(interview.Questions);
            }

            // 3. Remove Invitations (dependent on Interview)
            if (interview.Invitations != null)
            {
                _db.CandidateInvitations.RemoveRange(interview.Invitations);
            }

            // 4. Remove Sessions (dependent on Interview)
            if (interview.Sessions != null)
            {
                _db.CompanyInterviewSessions.RemoveRange(interview.Sessions);
            }


            // 5. Remove the main interview entity
            _db.CompanyInterviews.Remove(interview);

            // --- Save all changes ---
            await _db.SaveChangesAsync();

            _logger.LogInformation("Company {CompanyId} successfully deleted interview {InterviewId} and all related entities.", _currentUser.UserId, interviewId);

            // Return 204 No Content as the operation is successful and there's no specific data to return
            return NoContent();
        }
        catch (DbUpdateException dbEx) // Catch database-specific exceptions
        {
            _logger.LogError(dbEx, "Database error occurred while deleting interview {InterviewId} for company {CompanyId}. See inner exception.", interviewId, _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "A database error occurred while deleting the interview. It might be related to existing data dependencies.",
                Code = "INTERVIEW_DELETION_DB_ERROR"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete interview {InterviewId} for company {CompanyId}", interviewId, _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while deleting the interview.",
                Code = "INTERVIEW_DELETION_FAILED"
            });
        }
    }


    /// <summary>
    /// Saves a candidate session
    /// </summary>
    [HttpPost("session/{sessionId:guid}/save")]
    public async Task<IActionResult> SaveCandidateSession(Guid sessionId)
    {
        _logger.LogInformation("Company {CompanyId} is attempting to save candidate session {SessionId}.", _currentUser.UserId, sessionId);

        try
        {
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized company request lacks UserId during session save. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            // Verify session ownership
            var session = await _db.CompanyInterviewSessions
                .Include(s => s.CompanyInterview)
                .Where(s => s.Id == sessionId &&
                       s.CompanyInterview.CompanyId == _currentUser.UserId.Value)
                .FirstOrDefaultAsync();

            if (session == null)
            {
                _logger.LogWarning("Company {CompanyId} attempted to save non-existent or unauthorized session {SessionId}.", _currentUser.UserId, sessionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Session not found or access denied.",
                    Code = "SESSION_NOT_FOUND"
                });
            }

            // Check if already saved
            var existingSaved = await _db.SavedCandidates
                .FirstOrDefaultAsync(sc => sc.CompanyId == _currentUser.UserId.Value && sc.SessionId == sessionId);

            if (existingSaved != null)
            {
                _logger.LogInformation("Session {SessionId} already saved for company {CompanyId}.", sessionId, _currentUser.UserId);
                return Ok(new { Message = "Candidate already saved.", SavedCandidateId = existingSaved.Id });
            }

            // Create saved candidate record
            var savedCandidate = new SavedCandidate
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.UserId.Value,
                SessionId = sessionId,
                CandidateEmail = session.CandidateEmail,
                InterviewId = session.CompanyInterviewId,
                InterviewTitle = session.CompanyInterview?.Title ?? "Unknown Interview",
                AverageScore = session.AverageScore,
                SavedAt = DateTime.UtcNow
            };

            _db.SavedCandidates.Add(savedCandidate);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Company {CompanyId} successfully saved candidate session {SessionId}.", _currentUser.UserId, sessionId);
            return Ok(new { Message = "Candidate saved successfully.", SavedCandidateId = savedCandidate.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save candidate session {SessionId} for company {CompanyId}", sessionId, _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while saving the candidate.",
                Code = "CANDIDATE_SAVE_FAILED"
            });
        }
    }

    /// <summary>
    /// Removes a saved candidate
    /// </summary>
    [HttpDelete("saved/{savedCandidateId:guid}")]
    public async Task<IActionResult> RemoveSavedCandidate(Guid savedCandidateId)
    {
        _logger.LogInformation("Company {CompanyId} is attempting to remove saved candidate {SavedCandidateId}.", _currentUser.UserId, savedCandidateId);

        try
        {
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized company request lacks UserId during saved candidate removal. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            var savedCandidate = await _db.SavedCandidates
                .FirstOrDefaultAsync(sc => sc.Id == savedCandidateId && sc.CompanyId == _currentUser.UserId.Value);

            if (savedCandidate == null)
            {
                _logger.LogWarning("Company {CompanyId} attempted to remove non-existent saved candidate {SavedCandidateId}.", _currentUser.UserId, savedCandidateId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Saved candidate not found or access denied.",
                    Code = "SAVED_CANDIDATE_NOT_FOUND"
                });
            }

            _db.SavedCandidates.Remove(savedCandidate);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Company {CompanyId} successfully removed saved candidate {SavedCandidateId}.", _currentUser.UserId, savedCandidateId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove saved candidate {SavedCandidateId} for company {CompanyId}", savedCandidateId, _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while removing the saved candidate.",
                Code = "CANDIDATE_REMOVE_FAILED"
            });
        }
    }

    /// <summary>
    /// Gets all saved candidates for the company
    /// </summary>
    [HttpGet("saved")]
    public async Task<IActionResult> GetSavedCandidates()
    {
        _logger.LogInformation("Company {CompanyId} is requesting saved candidates list.", _currentUser.UserId);

        try
        {
            if (!_currentUser.UserId.HasValue)
            {
                _logger.LogError("Authorized company request lacks UserId during saved candidates fetch. User: {User}", _currentUser.GetUserAsync()?.Result?.Email ?? "Unknown");
                return StatusCode(500, new ApiErrorResponse
                {
                    Message = "User identification failed.",
                    Code = "USER_ID_MISSING"
                });
            }

            var savedCandidates = await _db.SavedCandidates
                .Where(sc => sc.CompanyId == _currentUser.UserId.Value)
                .OrderByDescending(sc => sc.SavedAt)
                .Select(sc => new
                {
                    sc.Id,
                    sc.CandidateEmail,
                    sc.InterviewTitle,
                    sc.AverageScore,
                    sc.SavedAt,
                    SessionId = sc.SessionId,
                    InterviewId = sc.InterviewId
                })
                .ToListAsync();

            _logger.LogInformation("Company {CompanyId} retrieved list of {Count} saved candidates.", _currentUser.UserId, savedCandidates.Count);
            return Ok(savedCandidates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve saved candidates list for company {CompanyId}", _currentUser.UserId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the saved candidates list.",
                Code = "SAVED_CANDIDATES_RETRIEVAL_FAILED"
            });
        }
    }


    private string GenerateInterviewLink(string token)
    {
        // Consider making the base URL configurable
        return $"{Request.Scheme}://{Request.Host}/api/candidate-interview/start/{token}";
    }
}

public record InviteCandidatesRequest(List<string> CandidateEmails);
