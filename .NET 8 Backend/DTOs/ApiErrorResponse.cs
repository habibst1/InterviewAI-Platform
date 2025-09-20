// In a shared DTOs file or a dedicated Error DTOs file
public class ApiErrorResponse
{
    public string Message { get; set; } = "An error occurred.";
    public string? Code { get; set; } // Optional error code for frontend logic
    public Dictionary<string, List<string>>? Errors { get; set; } // For validation errors
}