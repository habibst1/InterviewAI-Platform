// Models/ActivityLog.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class ActivityLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)] // e.g., "domain_created", "question_added"
    public string Type { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)] // Description of the activity
    public string Description { get; set; } = string.Empty;

    [Required]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

}