using Sms.Application.DTOs.Chat;
using Sms.Application.DTOs.Common;

namespace Sms.Application.Interfaces;

public interface IChatService
{
    Task<ApiResponse<ChatMessageDto>> SendMessageAsync(Guid senderId, SendMessageRequest request);
    Task<ApiResponse<List<ChatMessageDto>>> GetConversationAsync(Guid userId, Guid otherUserId, int take = 50, int skip = 0);
    Task<ApiResponse<List<ConversationDto>>> GetConversationsAsync(Guid userId);
    Task<ApiResponse<List<ChatContactDto>>> GetContactsAsync(Guid userId);
    Task<ApiResponse> MarkAsReadAsync(Guid userId, MarkMessagesReadRequest request);
    Task<ApiResponse<int>> GetUnreadCountAsync(Guid userId);
}
