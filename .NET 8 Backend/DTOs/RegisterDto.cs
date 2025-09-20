using System.ComponentModel.DataAnnotations;

public class RegisterDto
{
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email address format.")]
    public string Email { get; set; }

    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; }

    [Required(ErrorMessage = "UserType is required.")]
    public UserType UserType { get; set; }

    // Regular user fields
    [RequiredIfUserType(UserType.Regular, ErrorMessage = "First name is required for Regular users.")]
    public string? FirstName { get; set; }

    [RequiredIfUserType(UserType.Regular, ErrorMessage = "Last name is required for Regular users.")]
    public string? LastName { get; set; }

    // Company fields
    [RequiredIfUserType(UserType.Company, ErrorMessage = "Company name is required for Company users.")]
    public string? CompanyName { get; set; }

    [RequiredIfUserType(UserType.Company, ErrorMessage = "Company logo is required for Company users.")]
    public IFormFile? LogoFile { get; set; }


    // Admin fields
    [RequiredIfUserType(UserType.Admin, ErrorMessage = "Department is required for Admin users.")]
    public string? Department { get; set; }
}