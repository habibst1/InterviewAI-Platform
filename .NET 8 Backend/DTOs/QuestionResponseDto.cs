public class QuestionResponseDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = null!;
    public string IdealAnswer { get; set; } = null!;
    public string? AudioUrl { get; set; }
    public Difficulty Difficulty { get; set; }
    public Guid DomainId { get; set; }
    public string DomainName { get; set; } = null!;
}