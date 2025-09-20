public class SavedCandidate
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid SessionId { get; set; }
    public string CandidateEmail { get; set; }
    public Guid InterviewId { get; set; }
    public string InterviewTitle { get; set; }
    public double? AverageScore { get; set; }
    public DateTime SavedAt { get; set; }

    // Navigation properties
    public Company Company { get; set; }
    public CompanyInterviewSession Session { get; set; }
    public CompanyInterview Interview { get; set; }
}