using Sms.Domain.Common;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sms.Domain.Entities;

public class Course : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? PreviewDescription { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int Credits { get; set; }
    public string Semester { get; set; } = string.Empty;
    public int Year { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
    
    // Instructor who teaches this course
    public Guid InstructorId { get; set; }
    public virtual ApplicationUser? Instructor { get; set; }
    
    // Navigation properties
    public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();
    public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
    public virtual ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();
}
