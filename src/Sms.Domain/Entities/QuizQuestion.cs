using Sms.Domain.Common;
using Sms.Domain.Enums;

namespace Sms.Domain.Entities;

public class QuizQuestion : BaseEntity
{
    public Guid QuizId { get; set; }
    public virtual Quiz Quiz { get; set; } = null!;
    
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; } = QuestionType.MultipleChoice;
    public int Marks { get; set; } = 1;
    public int Order { get; set; }
    
    // For multiple choice - JSON array of options
    public string? Options { get; set; }
    
    // Correct answer (index for MC, "true"/"false" for T/F, text for short answer)
    public string CorrectAnswer { get; set; } = string.Empty;
    
    public virtual ICollection<QuizAnswer> Answers { get; set; } = new List<QuizAnswer>();
}
