public class InterviewResponse
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public InterviewSession? Session { get; set; }
    public Guid QuestionId { get; set; }
    public InterviewQuestion? Question { get; set; }
    public int Order { get; set; }  // 1, 2, 3... (session-specific order)
    public string? UserAudioUrl { get; set; } // User recording
    public string? UserAudioTranscribed { get; set; } 
    public string? Feedback { get; set; }
    public int? Score { get; set; }
}