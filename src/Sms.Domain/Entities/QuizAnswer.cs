using Sms.Domain.Common;

namespace Sms.Domain.Entities;

public class QuizAnswer : BaseEntity
{
    public Guid AttemptId { get; set; }
    public virtual QuizAttempt Attempt { get; set; } = null!;
    
    public Guid QuestionId { get; set; }
    public virtual QuizQuestion Question { get; set; } = null!;
    
    public string? AnswerText { get; set; }
    public bool IsCorrect { get; set; }
    public decimal MarksAwarded { get; set; }
}
