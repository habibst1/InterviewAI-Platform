public class InterviewSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RegularUserId { get; set; }
    public RegularUser? User { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public bool IsCompleted { get; set; }
    public List<InterviewResponse> Responses { get; set; } = new();
    public Guid DomainId { get; set; } // Foreign Key
    public Domain? Domain { get; set; } // Navigation Property
}