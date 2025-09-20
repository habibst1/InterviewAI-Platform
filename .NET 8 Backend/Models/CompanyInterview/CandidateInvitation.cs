public class CandidateInvitation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyInterviewId { get; set; }
    public CompanyInterview? CompanyInterview { get; set; }
    public string CandidateEmail { get; set; } = null!;
    public string UniqueLinkToken { get; set; } = null!; // Unique token for this candidate
    public bool IsUsed { get; set; } // Tracks if the link has been used
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? SessionId { get; set; } // Links to the session created by this invitation
    public CompanyInterviewSession? Session { get; set; }
}
