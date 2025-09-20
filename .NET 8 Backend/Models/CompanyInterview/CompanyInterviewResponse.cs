public class CompanyInterviewResponse
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public CompanyInterviewSession? Session { get; set; }
    public Guid CompanyInterviewQuestionId { get; set; }
    public CompanyInterviewQuestion? Question { get; set; }
    public int Order { get; set; } // 1, 2, 3...
    public string? UserAudioUrl { get; set; }
    public string? UserAudioTranscribed { get; set; }
    public string? Feedback { get; set; }
    public int? Score { get; set; } // Stored but not shared with candidates
}