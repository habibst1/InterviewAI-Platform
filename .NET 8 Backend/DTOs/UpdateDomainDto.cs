public class UpdateDomainDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public IFormFile? Logo { get; set; } // Optional logo file for update
}