using Sms.Application.DTOs.Common;
using Sms.Domain.Entities;

namespace Sms.Application.Interfaces;

public interface IPaymentService
{
    Task<ApiResponse<Payment>> CreatePaymentIntentAsync(Guid userId, Guid courseId);
    Task<ApiResponse> HandleWebhookAsync(string json, string signature);
    Task<ApiResponse<List<Payment>>> GetUserPaymentsAsync(Guid userId);
}
