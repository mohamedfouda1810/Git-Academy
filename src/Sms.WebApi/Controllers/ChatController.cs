using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sms.Application.DTOs.Chat;
using Sms.Application.Interfaces;

namespace Sms.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var userId = GetUserId();
        var result = await _chatService.GetConversationsAsync(userId);
        return Ok(result);
    }

    [HttpGet("contacts")]
    public async Task<IActionResult> GetContacts()
    {
        var userId = GetUserId();
        var result = await _chatService.GetContactsAsync(userId);
        return Ok(result);
    }

    [HttpGet("messages/{otherUserId}")]
    public async Task<IActionResult> GetMessages(Guid otherUserId, [FromQuery] int take = 50, [FromQuery] int skip = 0)
    {
        var userId = GetUserId();
        var result = await _chatService.GetConversationAsync(userId, otherUserId, take, skip);
        return Ok(result);
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        var userId = GetUserId();
        var result = await _chatService.SendMessageAsync(userId, request);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("mark-read")]
    public async Task<IActionResult> MarkAsRead([FromBody] MarkMessagesReadRequest request)
    {
        var userId = GetUserId();
        var result = await _chatService.MarkAsReadAsync(userId, request);
        return Ok(result);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        var result = await _chatService.GetUnreadCountAsync(userId);
        return Ok(result);
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
