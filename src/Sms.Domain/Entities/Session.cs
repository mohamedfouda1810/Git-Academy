using Sms.Domain.Common;

namespace Sms.Domain.Entities;

public class Session : BaseEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Order { get; set; }
    public string? PdfUrl { get; set; }
    public string? VideoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    
    // Navigation properties
    public virtual Course Course { get; set; } = null!;
    public virtual Quiz? Quiz { get; set; }
}
