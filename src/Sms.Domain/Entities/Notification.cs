using Sms.Domain.Common;
using Sms.Domain.Enums;

namespace Sms.Domain.Entities;

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual ApplicationUser User { get; set; } = null!;
    
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    
    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }
    
    // Optional reference to related entity
    public string? ReferenceId { get; set; }
    public string? ReferenceType { get; set; }
    
    // For email notifications
    public bool EmailSent { get; set; } = false;
    public DateTime? EmailSentAt { get; set; }
}
