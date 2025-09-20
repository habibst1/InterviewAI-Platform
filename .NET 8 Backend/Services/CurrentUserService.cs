using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

public interface ICurrentUserService
{
    UserType? UserType { get; }
    Guid? UserId { get; }
    Task<User> GetUserAsync();
}

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly UserManager<User> _userManager;

    public CurrentUserService(
        IHttpContextAccessor httpContextAccessor,
        UserManager<User> userManager)
    {
        _httpContextAccessor = httpContextAccessor;
        _userManager = userManager;
    }

    public UserType? UserType =>
        _httpContextAccessor.HttpContext?.User.FindFirstValue("UserType") is string typeStr
            ? Enum.Parse<UserType>(typeStr)
            : null;

    public Guid? UserId =>
        _userManager.GetUserId(_httpContextAccessor.HttpContext?.User) is string idStr
            ? Guid.Parse(idStr)
            : null;

    public async Task<User> GetUserAsync() =>
        await _userManager.GetUserAsync(_httpContextAccessor.HttpContext?.User);
}