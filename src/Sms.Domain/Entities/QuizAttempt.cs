using Sms.Domain.Common;

namespace Sms.Domain.Entities;

public class QuizAttempt : BaseEntity
{
    public Guid QuizId { get; set; }
    public virtual Quiz Quiz { get; set; } = null!;
    
    public Guid StudentId { get; set; }
    public virtual ApplicationUser Student { get; set; } = null!;
    
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SubmittedAt { get; set; }
    public bool IsCompleted { get; set; } = false;
    public decimal? Score { get; set; }
    public decimal? Percentage { get; set; }
    
    public virtual ICollection<QuizAnswer> Answers { get; set; } = new List<QuizAnswer>();
}
