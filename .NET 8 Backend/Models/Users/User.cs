using Microsoft.AspNetCore.Identity;

public abstract class User : IdentityUser<Guid>
{
    public UserType Type { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum UserType
{
    Regular,
    Company,
    Admin
}