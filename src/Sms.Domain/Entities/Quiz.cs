using Sms.Domain.Common;

namespace Sms.Domain.Entities;

public class Quiz : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; } = 30;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int TotalMarks { get; set; }
    public bool IsActive { get; set; } = true;
    public bool ShuffleQuestions { get; set; } = false;
    public int? MaxAttempts { get; set; } = 1;
    
    // Course-level quiz (optional if session-level)
    public Guid? CourseId { get; set; }
    public virtual Course? Course { get; set; }
    
    // Session-level quiz (optional if course-level)
    public Guid? SessionId { get; set; }
    public virtual Session? Session { get; set; }
    
    public Guid CreatedById { get; set; }
    public virtual ApplicationUser CreatedBy { get; set; } = null!;
    
    public virtual ICollection<QuizQuestion> Questions { get; set; } = new List<QuizQuestion>();
    public virtual ICollection<QuizAttempt> Attempts { get; set; } = new List<QuizAttempt>();
}
