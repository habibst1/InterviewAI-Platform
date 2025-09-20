public class Company : User
{
    public string CompanyName { get; set; } = null!;
    public string? LogoUrl { get; set; }
    public List<CompanyInterview> Interviews { get; set; } = new List<CompanyInterview>();

    // Navigation property for saved candidates
    public virtual ICollection<SavedCandidate> SavedCandidates { get; set; } = new List<SavedCandidate>();
    public Company()
    {
        Type = UserType.Company;
    }
}