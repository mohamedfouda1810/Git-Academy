using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Notification;
using Sms.Domain.Enums;

namespace Sms.Application.Interfaces;

public interface INotificationService
{
    Task<ApiResponse<List<NotificationDto>>> GetNotificationsAsync(Guid userId, bool unreadOnly = false);
    Task<ApiResponse<int>> GetUnreadCountAsync(Guid userId);
    Task<ApiResponse> MarkAsReadAsync(Guid notificationId);
    Task<ApiResponse> MarkAllAsReadAsync(Guid userId);
    Task<ApiResponse> DeleteAsync(Guid notificationId);
    
    // Create and send notifications
    Task CreateNotificationAsync(CreateNotificationRequest request);
    Task NotifyQuizAvailableAsync(Guid courseId, Guid quizId, string quizTitle);
    Task NotifyAssignmentDueAsync(Guid courseId, Guid assignmentId, string assignmentTitle, DateTime dueDate);
    Task NotifyNewMessageAsync(Guid receiverId, string senderName);
    Task NotifyGradePostedAsync(Guid studentId, string courseName, string itemTitle, decimal score);
    
    // New session notification
    Task NotifyNewSessionAsync(Guid courseId, Guid sessionId, string sessionTitle);
}
