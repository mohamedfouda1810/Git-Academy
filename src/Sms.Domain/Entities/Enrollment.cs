using Sms.Domain.Common;

namespace Sms.Domain.Entities;

public class Enrollment : BaseEntity
{
    public Guid StudentId { get; set; }
    public virtual ApplicationUser Student { get; set; } = null!;
    
    public Guid CourseId { get; set; }
    public virtual Course Course { get; set; } = null!;
    
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public decimal? FinalGrade { get; set; }
    public bool IsActive { get; set; } = true;
}
