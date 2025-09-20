using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims; 


[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AdminController> _logger; // Add logger
    private readonly IWebHostEnvironment _environment; // For file storage path
    private readonly UserManager<User> _userManager;
    private readonly IPythonAIService _pythonAI;
    private readonly IServiceScopeFactory _serviceScopeFactory; // For background tasks

    public AdminController(
        AppDbContext context,
        ILogger<AdminController> logger,
        IWebHostEnvironment environment,
        UserManager<User> userManager,
        IPythonAIService pythonAI,
        IServiceScopeFactory serviceScopeFactory
        )
    {
        _context = context;
        _logger = logger;
        _environment = environment;
        _userManager = userManager;
        _pythonAI = pythonAI;
        _serviceScopeFactory = serviceScopeFactory;
    }

    // -------------------- DOMAIN MANAGEMENT --------------------

    [HttpPost("domains/create")]
    public async Task<IActionResult> CreateDomainAsync([FromForm] CreateDomainDto dto)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid domain data provided.",
                Code = "INVALID_DOMAIN_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }

        // 2. Business logic validation
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            _logger.LogWarning("Admin attempted to create domain with empty name.");
            return BadRequest(new ApiErrorResponse
            {
                Message = "Domain name is required.",
                Code = "DOMAIN_NAME_REQUIRED"
            });
        }

        // 3. Check for duplicates
        var existingDomain = await _context.Domains
            .FirstOrDefaultAsync(d => d.Name.Trim().ToLower() == dto.Name.Trim().ToLower());
        if (existingDomain != null)
        {
            _logger.LogWarning("Admin attempted to create duplicate domain: {DomainName}", dto.Name);
            return Conflict(new ApiErrorResponse
            {
                Message = "A domain with this name already exists.",
                Code = "DOMAIN_ALREADY_EXISTS"
            });
        }

        try
        {

            // Handle logo file upload ---
            string? logoUrl = null;
            if (dto.Logo != null && dto.Logo.Length > 0)
            {
                // Validate file type
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
                var extension = Path.GetExtension(dto.Logo.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest(new ApiErrorResponse
                    {
                        Message = "Invalid file type. Only JPG, JPEG, PNG, and GIF files are allowed.",
                        Code = "INVALID_LOGO_FILE_TYPE"
                    });
                }

                // Validate file size
                const long maxFileSize = 5 * 1024 * 1024; // 5MB
                if (dto.Logo.Length > maxFileSize)
                {
                    return BadRequest(new ApiErrorResponse
                    {
                        Message = "File size exceeds limit. Maximum allowed size is 5MB.",
                        Code = "LOGO_FILE_TOO_LARGE"
                    });
                }

                // Generate unique filename
                var fileName = $"{Guid.NewGuid()}{extension}";

                // Define upload path
                var uploadPath = Path.Combine(_environment.WebRootPath, "uploads", "logos");
                if (!Directory.Exists(uploadPath))
                {
                    Directory.CreateDirectory(uploadPath);
                }

                // Save file
                var filePath = Path.Combine(uploadPath, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.Logo.CopyToAsync(stream);
                }

                // Store relative URL path
                logoUrl = $"/uploads/logos/{fileName}";
            }

            var domain = new Domain { Id = Guid.NewGuid(), Name = dto.Name.Trim(), LogoUrl = logoUrl };

            _context.Domains.Add(domain);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin created new domain. DomainId: {DomainId}, Name: {DomainName}", domain.Id, domain.Name);
            await LogActivityAsync("domain_created", $"Domain '{domain.Name}' was created.");
            // Return success DTO
            return Ok(new { domain.Id, domain.Name, domain.LogoUrl, domain.CreatedAt });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while creating domain: {DomainName}", dto.Name);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while creating the domain.",
                Code = "DOMAIN_CREATION_FAILED"
            });
        }
    }

    [HttpGet("domains/all")]
    public async Task<IActionResult> GetAllDomainsAsync()
    {
        try
        {
            var domains = await _context.Domains
                .Select(d => new {
                    d.Id,
                    d.Name,
                    d.CreatedAt,
                    d.SessionCount,
                    d.LogoUrl
                })
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} domains for admin.", domains.Count);
            return Ok(domains);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve domains for admin.");
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving domains.",
                Code = "DOMAINS_RETRIEVAL_FAILED"
            });
        }
    }

    [HttpDelete("domains/{domainId}/delete")]
    public async Task<IActionResult> DeleteDomainAsync(Guid domainId)
    {
        try
        {
            var domain = await _context.Domains.FindAsync(domainId);

            if (domain == null)
            {
                _logger.LogWarning("Admin attempted to delete non-existent domain: {DomainId}", domainId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Domain not found.",
                    Code = "DOMAIN_NOT_FOUND"
                });
            }

            var questionCount = await _context.InterviewQuestions.CountAsync(q => q.DomainId == domainId);
            _logger.LogInformation("Admin deleting domain {DomainId} ({DomainName}). Associated questions: {QuestionCount}", domain.Id, domain.Name, questionCount);

            _context.Domains.Remove(domain);
            await _context.SaveChangesAsync();
            await LogActivityAsync("domain_deleted", $"Domain '{domain.Name}' was deleted.");
            _logger.LogInformation("Domain deleted successfully. DomainId: {DomainId}", domain.Id);
            return NoContent(); // Standard for successful deletion
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while deleting domain {DomainId}", domainId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while deleting the domain.",
                Code = "DOMAIN_DELETION_FAILED"
            });
        }
    }

    // -------------------- QUESTION MANAGEMENT --------------------

    [HttpPost("domains/questions/create")]
    public async Task<IActionResult> CreateQuestionAsync([FromBody] CreateQuestionDto dto)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid question data provided.",
                Code = "INVALID_QUESTION_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }
        try
        {
            var domain = await _context.Domains.FindAsync(dto.DomainId);
            if (domain == null)
            {
                _logger.LogWarning("Admin attempted to create question for non-existent domain: {DomainId}", dto.DomainId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Domain not found.",
                    Code = "DOMAIN_NOT_FOUND_FOR_QUESTION"
                });
            }
            var question = new InterviewQuestion
            {
                Id = Guid.NewGuid(),
                Text = dto.Text?.Trim() ?? "", // Handle potential null
                IdealAnswer = dto.IdealAnswer?.Trim() ?? "", // Handle potential null
                AudioUrl = string.IsNullOrWhiteSpace(dto.AudioUrl) ? null : dto.AudioUrl.Trim(), // Normalize null/empty
                Difficulty = dto.Difficulty,
                DomainId = dto.DomainId // Set FK
            };
            _context.InterviewQuestions.Add(question);
            await _context.SaveChangesAsync(); // Save first to get the ID

            _logger.LogInformation("Admin created new question. QuestionId: {QuestionId}, DomainId: {DomainId}", question.Id, domain.Id);

            // Trigger background TTS generation if AudioUrl is missing ---
            // Check if AudioUrl was not provided by the admin and needs generation
            if (string.IsNullOrWhiteSpace(question.AudioUrl))
            {
                _logger.LogDebug("AudioUrl missing for new question {QuestionId}. Triggering background TTS generation.", question.Id);
                // Fire and forget the background TTS task
                _ = Task.Run(async () =>
                {
                    try
                    {
                        // Create a new scope for the background task
                        using var scope = _serviceScopeFactory.CreateScope();
                        var scopedContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                        var scopedPythonAI = scope.ServiceProvider.GetRequiredService<IPythonAIService>();
                        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AdminController>>(); // Or a dedicated background service logger

                        // Fetch the question again within the scoped context to ensure it's tracked correctly
                        var dbQuestion = await scopedContext.InterviewQuestions.FindAsync(question.Id);
                        if (dbQuestion != null && string.IsNullOrWhiteSpace(dbQuestion.AudioUrl))
                        {
                            logger.LogDebug("Starting background TTS for question {QuestionId}", dbQuestion.Id);
                            var audioUrl = await scopedPythonAI.GenerateQuestionAudio(dbQuestion.Text);
                            dbQuestion.AudioUrl = audioUrl;
                            await scopedContext.SaveChangesAsync();
                            logger.LogInformation("Background TTS completed successfully for question {QuestionId}. AudioUrl: {AudioUrl}", dbQuestion.Id, audioUrl);
                        }
                        else if (dbQuestion == null)
                        {
                            logger.LogWarning("Question {QuestionId} not found in database during background TTS trigger.", question.Id);
                        }
                        else
                        {
                            // AudioUrl was populated by another process or admin edit in the meantime
                            logger.LogDebug("AudioUrl already exists for question {QuestionId}. Skipping background TTS.", dbQuestion.Id);
                        }
                    }
                    catch (Exception ex)
                    {
                        // Log the error but don't let it crash the background task thread
                        _logger.LogError(ex, "Background TTS generation failed for question {QuestionId}", question.Id);
                    }
                });
            }

            // Return detailed DTO
            return Ok(new QuestionResponseDto
            {
                Id = question.Id,
                Text = question.Text,
                IdealAnswer = question.IdealAnswer,
                AudioUrl = question.AudioUrl, // This might still be null if TTS just started
                Difficulty = question.Difficulty,
                DomainId = domain.Id,
                DomainName = domain.Name
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while creating question for domain {DomainId}", dto?.DomainId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while creating the question.",
                Code = "QUESTION_CREATION_FAILED"
            });
        }
    }

    [HttpGet("domains/{domainId}/questions")]
    public async Task<IActionResult> GetQuestionsByDomainAsync(Guid domainId)
    {
        try
        {
            // Check if domain exists first
            var domainExists = await _context.Domains.AnyAsync(d => d.Id == domainId);
            if (!domainExists)
            {
                _logger.LogWarning("Admin requested questions for non-existent domain: {DomainId}", domainId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Domain not found.",
                    Code = "DOMAIN_NOT_FOUND_FOR_QUESTIONS"
                });
            }

            var questions = await _context.InterviewQuestions
                .Where(q => q.DomainId == domainId)
                .Select(q => new QuestionResponseDto
                {
                    Id = q.Id,
                    Text = q.Text,
                    IdealAnswer = q.IdealAnswer,
                    AudioUrl = q.AudioUrl,
                    Difficulty = q.Difficulty,
                    DomainId = q.DomainId,
                    DomainName = q.Domain.Name // Include domain name via navigation property
                })
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} questions for domain {DomainId}", questions.Count, domainId);
            return Ok(questions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve questions for domain {DomainId}", domainId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving questions.",
                Code = "QUESTIONS_RETRIEVAL_FAILED"
            });
        }
    }

    [HttpPut("domains/questions/{questionId}/update")]
    public async Task<IActionResult> UpdateQuestionAsync(Guid questionId, [FromBody] UpdateQuestionDto dto)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid question update data provided.",
                Code = "INVALID_QUESTION_UPDATE_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }

        try
        {
            // Use FindAsync for potentially tracked entity
            var question = await _context.InterviewQuestions.FindAsync(questionId);
            if (question == null)
            {
                _logger.LogWarning("Admin attempted to update non-existent question: {QuestionId}", questionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Question not found.",
                    Code = "QUESTION_NOT_FOUND"
                });
            }

            // Store old values for logging and comparison
            var oldText = question.Text;
            var oldDifficulty = question.Difficulty;
            var oldAudioUrl = question.AudioUrl;

            // Update fields - AudioUrl is handled automatically
            var newText = dto.Text?.Trim();
            if (!string.IsNullOrEmpty(newText))
            {
                question.Text = newText;
            }

            question.IdealAnswer = dto.IdealAnswer?.Trim() ?? "";
            question.Difficulty = dto.Difficulty;

            // Check if text changed to determine if we need to regenerate audio
            bool textChanged = question.Text != oldText;
            bool shouldRegenerateAudio = textChanged;

            // Clear the AudioUrl if text changed - it will be regenerated
            if (textChanged)
            {
                question.AudioUrl = null;
                _logger.LogDebug("Question text changed for question {QuestionId}. AudioUrl cleared for regeneration.", question.Id);
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin updated question {QuestionId}. Text changed from '{OldText}' to '{NewText}'. Difficulty changed from {OldDifficulty} to {NewDifficulty}. AudioUrl changed from '{OldAudioUrl}' to '{NewAudioUrl}'.",
                question.Id, oldText ?? "null", question.Text ?? "null", oldDifficulty, question.Difficulty, oldAudioUrl ?? "null", question.AudioUrl ?? "null");

            // Trigger background TTS generation if text changed
            if (shouldRegenerateAudio && !string.IsNullOrWhiteSpace(question.Text))
            {
                _logger.LogDebug("Triggering background TTS generation for question {QuestionId}.", question.Id);

                // Fire and forget the background TTS task
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = _serviceScopeFactory.CreateScope();
                        var scopedContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                        var scopedPythonAI = scope.ServiceProvider.GetRequiredService<IPythonAIService>();
                        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AdminController>>();

                        var dbQuestion = await scopedContext.InterviewQuestions.FindAsync(question.Id);
                        if (dbQuestion != null && string.IsNullOrWhiteSpace(dbQuestion.AudioUrl) && !string.IsNullOrWhiteSpace(dbQuestion.Text))
                        {
                            logger.LogDebug("Starting background TTS for updated question {QuestionId}", dbQuestion.Id);
                            var audioUrl = await scopedPythonAI.GenerateQuestionAudio(dbQuestion.Text);
                            dbQuestion.AudioUrl = audioUrl;
                            await scopedContext.SaveChangesAsync();
                            logger.LogInformation("Background TTS completed successfully for updated question {QuestionId}. AudioUrl: {AudioUrl}", dbQuestion.Id, audioUrl);
                        }
                        else if (dbQuestion == null)
                        {
                            logger.LogWarning("Question {QuestionId} not found in database during background TTS trigger after update.", question.Id);
                        }
                        else
                        {
                            logger.LogDebug("Skipping background TTS for updated question {QuestionId} (AudioUrl exists or Text is empty).", dbQuestion.Id);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Background TTS generation failed for updated question {QuestionId}", question.Id);
                    }
                });
            }

            // Return updated info
            return Ok(new { question.Id, question.Text, question.Difficulty, question.AudioUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating question {QuestionId}", questionId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while updating the question.",
                Code = "QUESTION_UPDATE_FAILED"
            });
        }
    }

    [HttpDelete("domains/questions/{questionId}/delete")]
    public async Task<IActionResult> DeleteQuestionAsync(Guid questionId)
    {
        try
        {
            // Use FindAsync for potentially tracked entity
            var question = await _context.InterviewQuestions.FindAsync(questionId);
            if (question == null)
            {
                _logger.LogWarning("Admin attempted to delete non-existent question: {QuestionId}", questionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Question not found.",
                    Code = "QUESTION_NOT_FOUND"
                });
            }

            _logger.LogInformation("Admin deleting question {QuestionId}. DomainId: {DomainId}", question.Id, question.DomainId);

            _context.InterviewQuestions.Remove(question);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Question deleted successfully. QuestionId: {QuestionId}", question.Id);
            return NoContent(); // Standard for successful deletion
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while deleting question {QuestionId}", questionId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while deleting the question.",
                Code = "QUESTION_DELETION_FAILED"
            });
        }
    }

    [HttpPatch("domains/questions/{questionId}/difficulty")]
    public async Task<IActionResult> ChangeQuestionDifficultyAsync(Guid questionId, [FromQuery] Difficulty difficulty)
    {
        // Validate the Difficulty enum value passed in the query string
        if (!Enum.IsDefined(typeof(Difficulty), difficulty))
        {
            _logger.LogWarning("Admin attempted to change question difficulty with invalid value: {Difficulty}", difficulty);
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid difficulty value provided.",
                Code = "INVALID_DIFFICULTY_VALUE"
            });
        }

        try
        {
            // Use FindAsync for potentially tracked entity
            var question = await _context.InterviewQuestions.FindAsync(questionId);
            if (question == null)
            {
                _logger.LogWarning("Admin attempted to change difficulty for non-existent question: {QuestionId}", questionId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Question not found.",
                    Code = "QUESTION_NOT_FOUND"
                });
            }

            var oldDifficulty = question.Difficulty;
            question.Difficulty = difficulty;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin changed difficulty for question {QuestionId} from {OldDifficulty} to {NewDifficulty}.", question.Id, oldDifficulty, difficulty);

            // Return updated info
            return Ok(new { question.Id, question.Difficulty });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while changing difficulty for question {QuestionId}", questionId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while changing the question difficulty.",
                Code = "QUESTION_DIFFICULTY_CHANGE_FAILED"
            });
        }
    }


    // Update Domain Endpoint ---
    /// <summary>
    /// Updates an existing domain's name and/or logo URL.
    /// </summary>
    /// <param name="domainId">The ID of the domain to update.</param>
    /// <param name="dto">The update data transfer object containing the new name and/or logo URL.</param>
    /// <returns>
    /// 200 OK: If the domain was successfully updated, returns the updated domain object.
    /// 400 Bad Request: If the request data is invalid (e.g., missing ID, invalid format).
    /// 404 Not Found: If the domain with the specified ID does not exist.
    /// 500 Internal Server Error: If an unexpected error occurs during the update process.
    /// </returns>
    [HttpPut("domains/{domainId:guid}")] // Route: PUT /api/admin/domains/{domainId}
    public async Task<IActionResult> UpdateDomainAsync(Guid domainId, [FromForm] UpdateDomainDto dto)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid domain update data provided.",
                Code = "INVALID_DOMAIN_UPDATE_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }

        // 2. Validate that the domainId in the route matches the Id in the DTO
        if (domainId != dto.Id)
        {
            _logger.LogWarning("Admin attempted to update domain with mismatched IDs. Route ID: {RouteId}, DTO ID: {DtoId}", domainId, dto.Id);
            return BadRequest(new ApiErrorResponse
            {
                Message = "Domain ID in the route must match the ID in the request body.",
                Code = "DOMAIN_ID_MISMATCH"
            });
        }

        try
        {
            // 3. Find the existing domain
            var existingDomain = await _context.Domains.FindAsync(domainId);
            if (existingDomain == null)
            {
                _logger.LogWarning("Admin attempted to update non-existent domain: {DomainId}", domainId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Domain not found.",
                    Code = "DOMAIN_NOT_FOUND"
                });
            }

            // 4. Store original values for logging
            var originalName = existingDomain.Name;
            var originalLogoUrl = existingDomain.LogoUrl;

            // 5. Update the domain properties
            existingDomain.Name = dto.Name.Trim();


            // Handle logo file update ---
            if (dto.Logo != null && dto.Logo.Length > 0)
            {
                // Validate file type
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
                var extension = Path.GetExtension(dto.Logo.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest(new ApiErrorResponse
                    {
                        Message = "Invalid file type. Only JPG, JPEG, PNG, and GIF files are allowed.",
                        Code = "INVALID_LOGO_FILE_TYPE"
                    });
                }

                // Validate file size
                const long maxFileSize = 5 * 1024 * 1024; // 5MB
                if (dto.Logo.Length > maxFileSize)
                {
                    return BadRequest(new ApiErrorResponse
                    {
                        Message = "File size exceeds limit. Maximum allowed size is 5MB.",
                        Code = "LOGO_FILE_TOO_LARGE"
                    });
                }

                // Delete old logo file if it exists
                if (!string.IsNullOrEmpty(existingDomain.LogoUrl))
                {
                    var oldFilePath = Path.Combine(_environment.WebRootPath, existingDomain.LogoUrl.TrimStart('/'));
                    if (System.IO.File.Exists(oldFilePath))
                    {
                        try
                        {
                            System.IO.File.Delete(oldFilePath);
                            _logger.LogInformation("Deleted old logo file: {FilePath}", oldFilePath);
                        }
                        catch (Exception deleteEx)
                        {
                            _logger.LogWarning(deleteEx, "Failed to delete old logo file: {FilePath}", oldFilePath);
                        }
                    }
                }

                // Generate unique filename
                var fileName = $"{Guid.NewGuid()}{extension}";

                // Define upload path
                var uploadPath = Path.Combine(_environment.WebRootPath, "uploads", "logos");
                if (!Directory.Exists(uploadPath))
                {
                    Directory.CreateDirectory(uploadPath);
                }

                // Save new file
                var filePath = Path.Combine(uploadPath, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.Logo.CopyToAsync(stream);
                }

                // Update LogoUrl
                existingDomain.LogoUrl = $"/uploads/logos/{fileName}";
            }


            // 6. Save changes to the database
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Admin updated domain {DomainId}. Name changed from '{OriginalName}' to '{NewName}'. LogoUrl changed from '{OriginalLogoUrl}' to '{NewLogoUrl}'.",
                existingDomain.Id,
                originalName,
                existingDomain.Name,
                originalLogoUrl ?? "null",
                existingDomain.LogoUrl ?? "null"
            );

            // 7. Return the updated domain object
            return Ok(new
            {
                existingDomain.Id,
                existingDomain.Name,
                existingDomain.LogoUrl, // Include the updated LogoUrl in the response
                existingDomain.CreatedAt,
                existingDomain.SessionCount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating domain {DomainId}", domainId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while updating the domain.",
                Code = "DOMAIN_UPDATE_FAILED"
            });
        }
    }


    [HttpGet("domains/{domainId:guid}/configuration")]
    public async Task<IActionResult> GetDomainConfiguration(Guid domainId)
    {
        try
        {
            var domain = await _context.Domains
                .Include(d => d.Configuration)
                .FirstOrDefaultAsync(d => d.Id == domainId);

            if (domain == null)
            {
                return NotFound(new ApiErrorResponse
                {
                    Message = "Domain not found.",
                    Code = "DOMAIN_NOT_FOUND"
                });
            }

            var config = domain.Configuration ?? new DomainConfiguration
            {
                DomainId = domainId,
                QuestionsPerE = 0,
                QuestionsPerD = 0,
                QuestionsPerC = 0,
                QuestionsPerB = 0,
                QuestionsPerA = 0
            };

            return Ok(new
            {
                config.Id,
                config.DomainId,
                config.QuestionsPerE,
                config.QuestionsPerD,
                config.QuestionsPerC,
                config.QuestionsPerB,
                config.QuestionsPerA,
                config.CreatedAt,
                config.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get configuration for domain {DomainId}", domainId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving domain configuration.",
                Code = "DOMAIN_CONFIGURATION_RETRIEVAL_FAILED"
            });
        }
    }

    [HttpPut("domains/{domainId:guid}/configuration")]
    public async Task<IActionResult> UpdateDomainConfiguration(Guid domainId, [FromBody] UpdateDomainConfigurationDto dto)
    {
        try
        {
            var domain = await _context.Domains
                .Include(d => d.Configuration)
                .FirstOrDefaultAsync(d => d.Id == domainId);

            if (domain == null)
            {
                return NotFound(new ApiErrorResponse
                {
                    Message = "Domain not found.",
                    Code = "DOMAIN_NOT_FOUND"
                });
            }

            // Create or update configuration
            if (domain.Configuration == null)
            {
                domain.Configuration = new DomainConfiguration
                {
                    DomainId = domainId,
                    QuestionsPerE = dto.QuestionsPerE,
                    QuestionsPerD = dto.QuestionsPerD,
                    QuestionsPerC = dto.QuestionsPerC,
                    QuestionsPerB = dto.QuestionsPerB,
                    QuestionsPerA = dto.QuestionsPerA
                };
                _context.DomainConfigurations.Add(domain.Configuration);
            }
            else
            {
                domain.Configuration.QuestionsPerE = dto.QuestionsPerE;
                domain.Configuration.QuestionsPerD = dto.QuestionsPerD;
                domain.Configuration.QuestionsPerC = dto.QuestionsPerC;
                domain.Configuration.QuestionsPerB = dto.QuestionsPerB;
                domain.Configuration.QuestionsPerA = dto.QuestionsPerA;
                domain.Configuration.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                domain.Configuration.Id,
                domain.Configuration.DomainId,
                domain.Configuration.QuestionsPerE,
                domain.Configuration.QuestionsPerD,
                domain.Configuration.QuestionsPerC,
                domain.Configuration.QuestionsPerB,
                domain.Configuration.QuestionsPerA,
                domain.Configuration.CreatedAt,
                domain.Configuration.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update configuration for domain {DomainId}", domainId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while updating domain configuration.",
                Code = "DOMAIN_CONFIGURATION_UPDATE_FAILED"
            });
        }

    }



    // Get Total Domain Count ---
    [HttpGet("dashboard/stats/domains/count")]
    public async Task<IActionResult> GetTotalDomainCountAsync()
    {
        try
        {
            var count = await _context.Domains.CountAsync();
            _logger.LogDebug("Retrieved total domain count: {Count}", count);
            return Ok(new CountResponseDto { Count = count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve total domain count.");
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the domain count.",
                Code = "DOMAIN_COUNT_RETRIEVAL_FAILED"
            });
        }
    }

    // Get Total Question Count ---
    [HttpGet("dashboard/stats/questions/count")]
    public async Task<IActionResult> GetTotalQuestionCountAsync()
    {
        try
        {
            var count = await _context.InterviewQuestions.CountAsync();
            _logger.LogDebug("Retrieved total question count: {Count}", count);
            return Ok(new CountResponseDto { Count = count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve total question count.");
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the question count.",
                Code = "QUESTION_COUNT_RETRIEVAL_FAILED"
            });
        }
    }


    /// <summary>
    /// Gets the total count of company users.
    /// </summary>
    [HttpGet("dashboard/stats/companies/count")]
    public async Task<IActionResult> GetTotalCompanyCountAsync()
    {
        try
        {
            // Count users where Type is UserType.Company
            var count = await _context.Users
                .OfType<Company>() // This filters by the Company type
                .CountAsync();

            _logger.LogDebug("Retrieved total company count: {Count}", count);
            return Ok(new CountResponseDto { Count = count }); // Use the existing DTO
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve total company count.");
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the company count.",
                Code = "COMPANY_COUNT_RETRIEVAL_FAILED"
            });
        }
    }


    // Get Recent Activity ---
    [HttpGet("dashboard/activity/recent")]
    public async Task<IActionResult> GetRecentActivityAsync([FromQuery] int limit = 10) // Allow limiting results
    {
        try
        {
            // Ensure limit is reasonable
            limit = Math.Max(1, Math.Min(limit, 50));

            var recentActivities = await _context.ActivityLogs
                .OrderByDescending(a => a.Timestamp) // Get most recent first
                .Take(limit)
                .Select(a => new ActivityLogDto
                {
                    Id = a.Id,
                    Type = a.Type,
                    Description = a.Description,
                    Timestamp = a.Timestamp
                })
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} recent activities.", recentActivities.Count);
            return Ok(recentActivities);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve recent activity.");
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving recent activity.",
                Code = "ACTIVITY_RETRIEVAL_FAILED"
            });
        }
    }

    /// <summary>
    /// Logs an activity to the ActivityLog table.
    /// </summary>
    /// <param name="type">Type of activity (e.g., "domain_created").</param>
    /// <param name="description">Description of the activity.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    private async Task LogActivityAsync(string type, string description)
    {
        try
        {
            var activityLog = new ActivityLog
            {
                Type = type,
                Description = description,
                Timestamp = DateTime.UtcNow
            };

            _context.ActivityLogs.Add(activityLog);
            await _context.SaveChangesAsync(); // Save the log entry
            _logger.LogDebug("Activity logged: Type={Type}, Description={Description}", type, description);
        }
        catch (Exception ex)
        {
            // Log the error but don't let logging failure break the main operation
            _logger.LogError(ex, "Failed to log activity: Type={Type}, Description={Description}", type, description);
        }
    }




    // -------------------- USER MANAGEMENT --------------------

    /// <summary>
    /// Gets a list of all company users.
    /// </summary>
    [HttpGet("users/companies")]
    public async Task<IActionResult> GetCompaniesAsync()
    {
        try
        {
            var companies = await _context.Users
                .OfType<Company>() // Filter for Company type
                .Select(c => new UserListDto
                {
                    Id = c.Id,
                    Email = c.Email ?? string.Empty,
                    UserName = c.UserName ?? string.Empty,
                    CreatedAt = c.CreatedAt,
                    CompanyName = c.CompanyName, // Include CompanyName
                    LogoUrl = c.LogoUrl
                })
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} companies for admin.", companies.Count);
            return Ok(companies);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve companies for admin.");
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving companies.",
                Code = "COMPANIES_RETRIEVAL_FAILED"
            });
        }
    }

    /// <summary>
    /// Deletes a company user and potentially associated data.
    /// </summary>
    [HttpDelete("users/companies/{companyId:guid}")]
    public async Task<IActionResult> DeleteCompanyAsync(Guid companyId)
    {
        try
        {
            // Find the company user
            var company = await _context.Users.OfType<Company>().FirstOrDefaultAsync(c => c.Id == companyId);

            if (company == null)
            {
                _logger.LogWarning("Admin attempted to delete non-existent company: {CompanyId}", companyId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Company not found.",
                    Code = "COMPANY_NOT_FOUND"
                });
            }

            // Log the company name before deletion as it will be gone after Remove
            string companyNameForLogging = company.CompanyName ?? "Unknown Company";
            Guid userIdForLogging = company.Id;

            _context.Users.Remove(company); // Remove the user entity
            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin deleted company user. UserId: {UserId}, CompanyName: {CompanyName}", userIdForLogging, companyNameForLogging);
            await LogActivityAsync("company_deleted", $"Company '{companyNameForLogging}' was deleted.");

            return NoContent(); // Standard for successful deletion
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while deleting company {CompanyId}", companyId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while deleting the company.",
                Code = "COMPANY_DELETION_FAILED"
            });
        }
    }


    /// <summary>
    /// Creates a new admin user.
    /// </summary>
    [HttpPost("users/admins")]
    public async Task<IActionResult> CreateAdminAsync([FromBody] CreateAdminDto dto)
    {
        // 1. Model validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid admin user data provided.",
                Code = "INVALID_ADMIN_DATA",
                Errors = ModelState
                    .Where(e => e.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    )
            });
        }

        try
        {
            // 2. Check if email already exists
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
            {
                _logger.LogWarning("Admin attempted to create admin with existing email: {Email}", dto.Email);
                return Conflict(new ApiErrorResponse
                {
                    Message = "A user with this email already exists.",
                    Code = "USER_EMAIL_ALREADY_EXISTS"
                });
            }

            // 3. Create the new Admin user object
            var newAdmin = new Admin
            {
                UserName = dto.Email, // Standard practice to use email as username
                Email = dto.Email,
                Department = dto.Department ?? string.Empty,
                // CreatedAt is set by the base class constructor
            };

            // 4. Use UserManager to create the user with password
            var userManager = HttpContext.RequestServices.GetRequiredService<UserManager<User>>();
            
            var result = await userManager.CreateAsync(newAdmin, dto.Password);

            if (!result.Succeeded)
            {
                // Handle Identity creation errors
                var errors = result.Errors.Select(e => e.Description).ToList();
                _logger.LogWarning("Failed to create admin user {Email}. Errors: {Errors}", dto.Email, string.Join(", ", errors));
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Failed to create admin user.",
                    Code = "ADMIN_CREATION_FAILED",
                    Errors = new Dictionary<string, List<string>> { { "IdentityErrors", errors } }
                });
            }

            // Add UserType claim
            var claimResult = await _userManager.AddClaimAsync(newAdmin, new Claim("UserType", newAdmin.Type.ToString()));
            if (!claimResult.Succeeded)
            {
                _logger.LogWarning("Failed to add UserType claim for user {UserId}. Errors: {Errors}",
                    newAdmin.Id,
                    string.Join(", ", claimResult.Errors.Select(e => $"{e.Code}: {e.Description}")));
            }


            _logger.LogInformation("Admin created new admin user. UserId: {UserId}, Email: {Email}", newAdmin.Id, newAdmin.Email);
            await LogActivityAsync("admin_created", $"Admin user '{newAdmin.Email}' was created.");

            // 5. Return success DTO
            return Ok(new UserListDto
            {
                Id = newAdmin.Id,
                Email = newAdmin.Email,
                UserName = newAdmin.UserName,
                CreatedAt = newAdmin.CreatedAt,
                Department = newAdmin.Department // Include Department for admins
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while creating admin user: {Email}", dto.Email);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while creating the admin user.",
                Code = "ADMIN_CREATION_FAILED"
            });
        }
    }

    // Example backend endpoint (add to AdminController.cs)
    /// <summary>
    /// Gets a list of all admin users.
    /// </summary>
    [HttpGet("users/admins")]
    public async Task<IActionResult> GetAdminsAsync()
    {
        try
        {
            var admins = await _context.Users
                .OfType<Admin>() // Filter for Admin type
                .Select(a => new UserListDto 
                {
                    Id = a.Id,
                    Email = a.Email ?? string.Empty,
                    UserName = a.UserName ?? string.Empty,
                    CreatedAt = a.CreatedAt,
                    Department = a.Department // Include Department for admins
                })
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} admins for admin.", admins.Count);
            return Ok(admins);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve admins for admin.");
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving administrators.",
                Code = "ADMINS_RETRIEVAL_FAILED"
            });
        }
    
    }



    /// <summary>
    /// Gets the total count of regular users.
    /// </summary>
    [HttpGet("dashboard/stats/users/regular/count")]
    public async Task<IActionResult> GetRegularUserCountAsync()
    {
        try
        {
            // Count users where Type is UserType.Regular
            var count = await _context.Users
                .OfType<RegularUser>()
                .CountAsync();

            _logger.LogDebug("Retrieved total regular user count: {Count}", count);
            return Ok(new CountResponseDto { Count = count }); // Use the existing DTO
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve total regular user count.");
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the regular user count.",
                Code = "REGULAR_USER_COUNT_RETRIEVAL_FAILED"
            });
        }
    }


    // <summary>
    /// Gets the total count of interview sessions.
    /// </summary>
    [HttpGet("dashboard/stats/sessions/count")]
    public async Task<IActionResult> GetTotalInterviewSessionCountAsync()
    {
        try
        {
            // Count all interview sessions
            var count = await _context.InterviewSessions.CountAsync();

            _logger.LogDebug("Retrieved total interview session count: {Count}", count);
            return Ok(new CountResponseDto { Count = count }); // Use the existing DTO
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve total interview session count.");
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the interview session count.",
                Code = "INTERVIEW_SESSION_COUNT_RETRIEVAL_FAILED"
            });
        }
    }



    // <summary>
    /// Gets the total count of company interview sessions.
    /// </summary>
    [HttpGet("dashboard/stats/company-sessions/count")]
    public async Task<IActionResult> GetTotalCompanyInterviewSessionCountAsync()
    {
        try
        {
            var count = await _context.CompanyInterviewSessions.CountAsync();

            _logger.LogDebug("Retrieved total company interview session count: {Count}", count);
            return Ok(new CountResponseDto { Count = count }); // Use the existing DTO
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve total company interview session count.");
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An error occurred while retrieving the company interview session count.",
                Code = "COMPANY_INTERVIEW_SESSION_COUNT_RETRIEVAL_FAILED"
            });
        }
    }




    /// <summary>
    /// Removes an admin user. This typically means deleting the user or removing the Admin role.
    /// This implementation deletes the user entirely.
    /// </summary>
    [HttpDelete("users/admins/{adminId:guid}")]
    public async Task<IActionResult> RemoveAdminAsync(Guid adminId)
    {
        try
        {
            // Prevent self-deletion
            // Get the ID of the currently authenticated admin user
            var currentAdminIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(currentAdminIdString, out Guid currentAdminId) && currentAdminId == adminId)
            {
                _logger.LogWarning("Admin {AdminId} attempted to delete themselves.", adminId);
                return BadRequest(new ApiErrorResponse
                {
                    Message = "You cannot delete your own admin account.",
                    Code = "ADMIN_SELF_DELETION_NOT_ALLOWED"
                });
            }

            // Find the admin user
            var admin = await _context.Users.OfType<Admin>().FirstOrDefaultAsync(a => a.Id == adminId);

            if (admin == null)
            {
                _logger.LogWarning("Admin attempted to remove non-existent admin: {AdminId}", adminId);
                return NotFound(new ApiErrorResponse
                {
                    Message = "Admin user not found.",
                    Code = "ADMIN_NOT_FOUND"
                });
            }

            // Log the admin email before deletion
            string adminEmailForLogging = admin.Email ?? "Unknown Email";
            Guid userIdForLogging = admin.Id;

            _context.Users.Remove(admin); // Remove the user entity
            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin removed admin user. UserId: {UserId}, Email: {Email}", userIdForLogging, adminEmailForLogging);
            await LogActivityAsync("admin_removed", $"Admin user '{adminEmailForLogging}' was removed.");

            return NoContent(); // Standard for successful deletion
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while removing admin {AdminId}", adminId);
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal error occurred while removing the admin user.",
                Code = "ADMIN_REMOVAL_FAILED"
            });
        }
    }
}