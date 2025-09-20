using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;


[ApiController]
[Route("api/[controller]")] 
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromForm] RegisterDto registerRequest)
    {
        // Basic model state validation (handles [Required] etc.)
        if (!ModelState.IsValid)
        {
            // Return detailed validation errors
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid registration data provided.",
                Code = "INVALID_REGISTRATION_DATA",
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
            // Check if email already exists
            var existingUser = await _userManager.FindByEmailAsync(registerRequest.Email);
            if (existingUser != null)
            {
                _logger.LogWarning("Registration attempt with existing email: {Email}", registerRequest.Email);
                return Conflict(new ApiErrorResponse
                {
                    Message = "A user with this email already exists.",
                    Code = "EMAIL_ALREADY_EXISTS"
                });
            }

            // Handle logo upload for company users
            string? logoUrl = null;
            if (registerRequest.UserType == UserType.Company && registerRequest.LogoFile != null)
            {
                logoUrl = await UploadCompanyLogoAsync(registerRequest.LogoFile);
                if (logoUrl == null)
                {
                    return BadRequest(new ApiErrorResponse
                    {
                        Message = "Failed to upload company logo.",
                        Code = "LOGO_UPLOAD_FAILED"
                    });
                }
            }

            // Create the appropriate user type
            User user = registerRequest.UserType switch
            {
                UserType.Regular => new RegularUser
                {
                    FirstName = registerRequest.FirstName ?? "", // Handle potential null if not required for UserType logic
                    LastName = registerRequest.LastName ?? "",
                    Email = registerRequest.Email,
                    UserName = registerRequest.Email,
                    // CreatedAt is set by the base User class constructor
                },
                UserType.Company => new Company
                {
                    CompanyName = registerRequest.CompanyName ?? "",
                    LogoUrl = logoUrl, 
                    Email = registerRequest.Email,
                    UserName = registerRequest.Email
                },
                UserType.Admin => new Admin
                {
                    Department = registerRequest.Department ?? "",
                    Email = registerRequest.Email,
                    UserName = registerRequest.Email
                },
                _ => null // This case should ideally be caught by model validation if UserType is constrained
            };

            // Double check user creation logic didn't fail silently (e.g., invalid UserType not caught by switch)
            if (user == null)
            {
                _logger.LogError("Failed to create user object for email {Email}. Invalid UserType: {UserType}", registerRequest.Email, registerRequest.UserType);
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Registration failed due to invalid user type.",
                    Code = "INVALID_USER_TYPE"
                });
            }

            var result = await _userManager.CreateAsync(user, registerRequest.Password);

            if (!result.Succeeded)
            {
                _logger.LogError("UserManager.CreateAsync failed for email {Email}. Errors: {Errors}",
                    registerRequest.Email,
                    string.Join(", ", result.Errors.Select(e => $"{e.Code}: {e.Description}")));

                // Map Identity errors to ApiErrorResponse format
                var identityErrors = result.Errors
                    .GroupBy(e => e.Code ?? "Unknown")
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(e => e.Description).ToList()
                    );

                return BadRequest(new ApiErrorResponse
                {
                    Message = "Registration failed due to validation errors.",
                    Code = "REGISTRATION_VALIDATION_ERROR",
                    Errors = identityErrors
                });
            }

            // Add UserType claim
            var claimResult = await _userManager.AddClaimAsync(user, new Claim("UserType", user.Type.ToString()));
            if (!claimResult.Succeeded)
            {
                _logger.LogWarning("Failed to add UserType claim for user {UserId}. Errors: {Errors}",
                    user.Id,
                    string.Join(", ", claimResult.Errors.Select(e => $"{e.Code}: {e.Description}")));
            }

            _logger.LogInformation("User registered successfully. UserId: {UserId}, Email: {Email}, Type: {UserType}",
                user.Id, user.Email, user.Type);

            // Return a successful response with relevant user info
            return Ok(new 
            {
                Message = "Registration successful",
                UserId = user.Id,
                Email = user.Email,
                UserType = user.Type,
                LogoUrl = (user as Company)?.LogoUrl 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred during user registration for email {Email}", registerRequest.Email);
            // Return a generic error to the client for unexpected server issues
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal server error occurred during registration. Please try again later.",
                Code = "REGISTRATION_INTERNAL_ERROR"
            });
        }
    }

    // Helper method to upload company logo
    private async Task<string?> UploadCompanyLogoAsync(IFormFile logoFile)
    {
        try
        {
            // Validate file type
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
            var extension = Path.GetExtension(logoFile.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
            {
                _logger.LogWarning("Invalid file extension for logo upload: {Extension}", extension);
                return null;
            }

            // Validate file size (e.g., max 5MB)
            if (logoFile.Length > 5 * 1024 * 1024)
            {
                _logger.LogWarning("Logo file too large: {FileSize} bytes", logoFile.Length);
                return null;
            }

            // Generate unique filename
            var fileName = $"{Guid.NewGuid()}{extension}";
            var uploadPath = Path.Combine("wwwroot", "uploads", "logos");

            // Ensure directory exists
            Directory.CreateDirectory(uploadPath);

            var filePath = Path.Combine(uploadPath, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await logoFile.CopyToAsync(stream);
            }

            // Return relative URL
            return $"/uploads/logos/{fileName}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading company logo");
            return null;
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        // Basic model state validation
        if (!ModelState.IsValid)
        {
            return BadRequest(new ApiErrorResponse
            {
                Message = "Invalid login data provided.",
                Code = "INVALID_LOGIN_DATA",
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
            var user = await _userManager.FindByEmailAsync(loginDto.Email);
            if (user == null)
            {
                _logger.LogWarning("Login attempt failed. User not found for email: {Email}", loginDto.Email);
                // Return generic error to prevent user enumeration
                return Unauthorized(new ApiErrorResponse
                {
                    Message = "Invalid credentials.",
                    Code = "INVALID_CREDENTIALS"
                });
            }

            // This validates the password
            var result = await _signInManager.PasswordSignInAsync(
                user,
                loginDto.Password,
                isPersistent: false, // Whether to persist the cookie beyond session
                lockoutOnFailure: false); // Whether to lock out on failed attempts

            if (!result.Succeeded)
            {
                _logger.LogWarning("Login attempt failed. Invalid password for email: {Email}", loginDto.Email);
                // Return generic error to prevent user enumeration
                return Unauthorized(new ApiErrorResponse
                {
                    Message = "Invalid credentials.",
                    Code = "INVALID_CREDENTIALS"
                });
            }


            var roles = await _userManager.GetRolesAsync(user);

            // Get logo URL for company users
            string? logoUrl = null;
            if (user.Type == UserType.Company)
            {
                var company = await _userManager.FindByIdAsync(user.Id.ToString()) as Company;
                if (company != null)
                {
                    logoUrl = company.LogoUrl;
                }
            }

            _logger.LogInformation("User logged in successfully. UserId: {UserId}, Email: {Email}", user.Id, user.Email);

            // Return successful login response
            return Ok(new AuthResponseDto
            {
                UserId = user.Id.ToString(),
                Email = user.Email,
                UserType = user.Type,
                Roles = roles.ToList(),
                LogoUrl = logoUrl
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred during login for email {Email}", loginDto.Email);
            // Return a generic error to the client for unexpected server issues
            return StatusCode(500, new ApiErrorResponse
            {
                Message = "An internal server error occurred during login. Please try again later.",
                Code = "LOGIN_INTERNAL_ERROR"
            });
        }
    }
}
