// Dtos/UserListDto.cs (Generic DTO for listing users)
public class UserListDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    // Add CompanyName if listing companies
    public string? CompanyName { get; set; }
    public string? LogoUrl { get; set; }

    // Add Department if listing admins
    public string? Department { get; set; }
}