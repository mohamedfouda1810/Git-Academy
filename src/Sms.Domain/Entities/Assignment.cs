using Sms.Domain.Common;

namespace Sms.Domain.Entities;

public class Assignment : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime DueDate { get; set; }
    public int MaxScore { get; set; } = 100;
    public string? AllowedFileTypes { get; set; } = ".pdf,.doc,.docx,.zip";
    public long MaxFileSizeBytes { get; set; } = 10 * 1024 * 1024; // 10MB default
    public bool IsActive { get; set; } = true;
    
    public Guid CourseId { get; set; }
    public virtual Course Course { get; set; } = null!;
    
    public Guid CreatedById { get; set; }
    public virtual ApplicationUser CreatedBy { get; set; } = null!;
    
    public virtual ICollection<AssignmentSubmission> Submissions { get; set; } = new List<AssignmentSubmission>();
}
