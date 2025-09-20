public enum Difficulty { E, D, C, B, A }

public class InterviewQuestion
{
    public Guid Id { get; set; }
    public string Text { get; set; } = null!;
    public string IdealAnswer { get; set; } = null!;
    public string? AudioUrl { get; set; }
    public Difficulty Difficulty { get; set; }

    public Guid DomainId { get; set; }
    public Domain Domain { get; set; } = null!;
}
