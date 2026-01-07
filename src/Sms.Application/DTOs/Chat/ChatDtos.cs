using Sms.Domain.Enums;

namespace Sms.Application.DTOs.Chat;

public record SendMessageRequest(
    Guid ReceiverId,
    string Content,
    Guid? CourseId
);

public record ChatMessageDto(
    Guid Id,
    Guid SenderId,
    string SenderName,
    string? SenderAvatar,
    Guid ReceiverId,
    string ReceiverName,
    string Content,
    bool IsRead,
    DateTime CreatedAt,
    Guid? CourseId,
    string? CourseName
);

public record ConversationDto(
    Guid UserId,
    string UserName,
    string? UserAvatar,
    UserRole UserRole,
    string LastMessage,
    DateTime LastMessageAt,
    int UnreadCount
);

public record ChatContactDto(
    Guid UserId,
    string UserName,
    string? UserAvatar,
    UserRole UserRole,
    string? CourseName
);

public record MarkMessagesReadRequest(
    Guid SenderId
);
