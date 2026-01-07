using Sms.Domain.Common;

namespace Sms.Domain.Entities;

public class ChatMessage : BaseEntity
{
    public Guid SenderId { get; set; }
    public virtual ApplicationUser Sender { get; set; } = null!;
    
    public Guid ReceiverId { get; set; }
    public virtual ApplicationUser Receiver { get; set; } = null!;
    
    public string Content { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }
    
    // Optional: link to a course context
    public Guid? CourseId { get; set; }
    public virtual Course? Course { get; set; }
}
