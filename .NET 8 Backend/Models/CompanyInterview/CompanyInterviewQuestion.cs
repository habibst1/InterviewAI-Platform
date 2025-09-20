public class CompanyInterviewQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyInterviewId { get; set; }
    public CompanyInterview? CompanyInterview { get; set; }
    public string Text { get; set; } = null!;
    public string IdealAnswer { get; set; } = null!;
    public string? AudioUrl { get; set; }
    public Difficulty Difficulty { get; set; }
    public int Order { get; set; }

}