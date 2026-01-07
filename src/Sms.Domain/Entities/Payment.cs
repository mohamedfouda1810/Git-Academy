using System.ComponentModel.DataAnnotations.Schema;

namespace Sms.Domain.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public virtual ApplicationUser? User { get; set; }
    
    public Guid CourseId { get; set; }
    public virtual Course? Course { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "usd";
    
    public string StripePaymentIntentId { get; set; } = string.Empty;
    public string? ClientSecret { get; set; }
    public string Status { get; set; } = string.Empty; // succeeded, pending, failed
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
