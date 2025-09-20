// DomainConfiguration.cs
public class DomainConfiguration
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DomainId { get; set; }
    public Domain Domain { get; set; } = null!;

    // Configuration for number of questions per difficulty tier
    public int QuestionsPerE { get; set; } = 0;      // Default to 0
    public int QuestionsPerD { get; set; } = 0; // Default to 0
    public int QuestionsPerC { get; set; } = 0; // Default to 0
    public int QuestionsPerB { get; set; } = 0; // Default to 0
    public int QuestionsPerA { get; set; } = 0;   // Default to 0

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}