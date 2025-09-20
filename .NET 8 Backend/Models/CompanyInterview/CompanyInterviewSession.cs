public class CompanyInterviewSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyInterviewId { get; set; }
    public CompanyInterview? CompanyInterview { get; set; }
    public string CandidateEmail { get; set; } = null!; // Candidate identifier
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public bool IsCompleted { get; set; }

    public double? AverageScore { get; set; }
    public List<CompanyInterviewResponse> Responses { get; set; } = new List<CompanyInterviewResponse>();
}