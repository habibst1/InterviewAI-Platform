public class UpdateQuestionDto
{
    public string Text { get; set; } = null!;
    public string IdealAnswer { get; set; } = null!;
    public string? AudioUrl { get; set; }
    public Difficulty Difficulty { get; set; }
}