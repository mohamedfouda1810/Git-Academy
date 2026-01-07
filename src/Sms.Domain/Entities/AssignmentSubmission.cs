using Sms.Domain.Common;
using Sms.Domain.Enums;

namespace Sms.Domain.Entities;

public class AssignmentSubmission : BaseEntity
{
    public Guid AssignmentId { get; set; }
    public virtual Assignment Assignment { get; set; } = null!;
    
    public Guid StudentId { get; set; }
    public virtual ApplicationUser Student { get; set; } = null!;
    
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Submitted;
    public decimal? Score { get; set; }
    public string? Feedback { get; set; }
    public Guid? GradedById { get; set; }
    public DateTime? GradedAt { get; set; }
}
