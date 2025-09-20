public class CreateDomainDto
{
    public string Name { get; set; } = null!;
    public IFormFile? Logo { get; set; } // Optional logo file
}
