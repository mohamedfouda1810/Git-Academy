using Sms.Domain.Enums;

namespace Sms.Application.DTOs.Notification;

public record NotificationDto(
    Guid Id,
    string Title,
    string Message,
    NotificationType Type,
    bool IsRead,
    string? ReferenceId,
    string? ReferenceType,
    DateTime CreatedAt
);

public record CreateNotificationRequest(
    Guid UserId,
    string Title,
    string Message,
    NotificationType Type,
    string? ReferenceId,
    string? ReferenceType,
    bool SendEmail
);

public record NotificationSettingsDto(
    bool EmailNotifications,
    bool QuizNotifications,
    bool AssignmentNotifications,
    bool MessageNotifications,
    bool GradeNotifications
);
