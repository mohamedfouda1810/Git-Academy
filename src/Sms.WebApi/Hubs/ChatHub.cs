using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Sms.Application.DTOs.Chat;
using Sms.Application.Interfaces;

namespace Sms.WebApi.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IChatService _chatService;
    private static readonly Dictionary<string, string> _userConnections = new();

    public ChatHub(IChatService chatService)
    {
        _chatService = chatService;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId != null)
        {
            _userConnections[userId] = Context.ConnectionId;
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId != null)
        {
            _userConnections.Remove(userId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(SendMessageRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return;

        var result = await _chatService.SendMessageAsync(Guid.Parse(userId), request);
        if (result.Success && result.Data != null)
        {
            // Send to sender
            await Clients.Caller.SendAsync("ReceiveMessage", result.Data);

            // Send to receiver
            await Clients.Group($"user_{request.ReceiverId}").SendAsync("ReceiveMessage", result.Data);
        }
    }

    public async Task MarkAsRead(Guid senderId)
    {
        var userId = GetUserId();
        if (userId == null) return;

        await _chatService.MarkAsReadAsync(Guid.Parse(userId), new MarkMessagesReadRequest(senderId));
        
        // Notify the sender that messages were read
        await Clients.Group($"user_{senderId}").SendAsync("MessagesRead", userId);
    }

    public async Task JoinConversation(Guid otherUserId)
    {
        var userId = GetUserId();
        if (userId == null) return;

        var conversationId = GetConversationId(userId, otherUserId.ToString());
        await Groups.AddToGroupAsync(Context.ConnectionId, conversationId);
    }

    public async Task LeaveConversation(Guid otherUserId)
    {
        var userId = GetUserId();
        if (userId == null) return;

        var conversationId = GetConversationId(userId, otherUserId.ToString());
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, conversationId);
    }

    private string? GetUserId()
    {
        return Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    private string GetConversationId(string userId1, string userId2)
    {
        var ids = new[] { userId1, userId2 }.OrderBy(x => x).ToArray();
        return $"conversation_{ids[0]}_{ids[1]}";
    }
}
