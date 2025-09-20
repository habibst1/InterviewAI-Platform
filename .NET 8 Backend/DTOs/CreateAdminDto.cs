using System.ComponentModel.DataAnnotations;

public class CreateAdminDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    public string Department { get; set; } = string.Empty; // Optional
}