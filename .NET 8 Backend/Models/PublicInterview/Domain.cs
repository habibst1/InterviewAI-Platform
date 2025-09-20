public class Domain
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int SessionCount { get; set; } = 0; // Initialize to 0
    public string? LogoUrl { get; set; }

    public DomainConfiguration? Configuration { get; set; }

    public ICollection<InterviewQuestion> Questions { get; set; } = new List<InterviewQuestion>();
}
