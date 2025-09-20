public class AuthResponseDto
{
    public string UserId { get; set; }
    public string Email { get; set; }
    public UserType UserType { get; set; }
    public List<string> Roles { get; set; }
    public string? LogoUrl { get; set; }
    public string Token { get; set; } // Will implement JWT later
}