public class CompanyInterview
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company? Company { get; set; }
    public string Title { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<CompanyInterviewQuestion> Questions { get; set; } = new List<CompanyInterviewQuestion>();
    public List<CompanyInterviewSession> Sessions { get; set; } = new List<CompanyInterviewSession>();
    public List<CandidateInvitation> Invitations { get; set; } = new List<CandidateInvitation>();
}