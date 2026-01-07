using Microsoft.EntityFrameworkCore;
using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Chat;
using Sms.Application.Interfaces;
using Sms.Domain.Entities;
using Sms.Domain.Enums;
using Sms.Infrastructure.Data;

namespace Sms.Infrastructure.Services;

public class ChatService : IChatService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public ChatService(ApplicationDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<ApiResponse<ChatMessageDto>> SendMessageAsync(Guid senderId, SendMessageRequest request)
    {
        var sender = await _context.Users.FindAsync(senderId);
        var receiver = await _context.Users.FindAsync(request.ReceiverId);

        if (sender == null || receiver == null)
            return ApiResponse<ChatMessageDto>.FailResponse("User not found");

        var message = new ChatMessage
        {
            SenderId = senderId,
            ReceiverId = request.ReceiverId,
            Content = request.Content,
            CourseId = request.CourseId
        };

        _context.ChatMessages.Add(message);
        await _context.SaveChangesAsync();

        // Send notification
        await _notificationService.NotifyNewMessageAsync(request.ReceiverId, sender.FullName);

        var dto = await GetMessageDtoAsync(message.Id);
        return ApiResponse<ChatMessageDto>.SuccessResponse(dto!);
    }

    public async Task<ApiResponse<List<ChatMessageDto>>> GetConversationAsync(Guid userId, Guid otherUserId, int take = 50, int skip = 0)
    {
        var messages = await _context.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.Receiver)
            .Include(m => m.Course)
            .Where(m => 
                (m.SenderId == userId && m.ReceiverId == otherUserId) ||
                (m.SenderId == otherUserId && m.ReceiverId == userId))
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var dtos = messages.Select(MapToDto).Reverse().ToList();
        return ApiResponse<List<ChatMessageDto>>.SuccessResponse(dtos);
    }

    public async Task<ApiResponse<List<ConversationDto>>> GetConversationsAsync(Guid userId)
    {
        var conversations = await _context.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.Receiver)
            .Where(m => m.SenderId == userId || m.ReceiverId == userId)
            .GroupBy(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
            .Select(g => new
            {
                OtherUserId = g.Key,
                LastMessage = g.OrderByDescending(m => m.CreatedAt).First(),
                UnreadCount = g.Count(m => m.ReceiverId == userId && !m.IsRead)
            })
            .ToListAsync();

        var userIds = conversations.Select(c => c.OtherUserId).ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var dtos = conversations.Select(c =>
        {
            var user = users[c.OtherUserId];
            return new ConversationDto(
                user.Id,
                user.FullName,
                user.ProfilePictureUrl,
                user.Role,
                c.LastMessage.Content.Length > 50 
                    ? c.LastMessage.Content.Substring(0, 50) + "..." 
                    : c.LastMessage.Content,
                c.LastMessage.CreatedAt,
                c.UnreadCount
            );
        }).OrderByDescending(c => c.LastMessageAt).ToList();

        return ApiResponse<List<ConversationDto>>.SuccessResponse(dtos);
    }

    public async Task<ApiResponse<List<ChatContactDto>>> GetContactsAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return ApiResponse<List<ChatContactDto>>.FailResponse("User not found");

        List<ChatContactDto> contacts;

        if (user.Role == UserRole.Student)
        {
            // Students can contact instructors from their enrolled courses
            var enrolledCourseIds = await _context.Enrollments
                .Where(e => e.StudentId == userId && e.IsActive)
                .Select(e => e.CourseId)
                .ToListAsync();

            var courses = await _context.Courses
                .Include(c => c.Instructor)
                .Where(c => enrolledCourseIds.Contains(c.Id))
                .ToListAsync();

            contacts = new List<ChatContactDto>();
            foreach (var course in courses)
            {
                if (course.Instructor != null)
                {
                    contacts.Add(new ChatContactDto(
                        course.Instructor.Id,
                        course.Instructor.FullName,
                        course.Instructor.ProfilePictureUrl,
                        course.Instructor.Role,
                        course.Name
                    ));
                }
            }

            // Add admins (previously advisors) if needed, or remove this logic based on decision. 
            // Assuming for now students can contact Admins.
            var admins = await _context.Users
                .Where(u => u.Role == UserRole.Admin && u.IsActive)
                .ToListAsync();

            contacts.AddRange(admins.Select(a => new ChatContactDto(
                a.Id, a.FullName, a.ProfilePictureUrl, a.Role, "Admin"
            )));

            contacts = contacts.DistinctBy(c => c.UserId).ToList();
        }
        else
        {
            // Instructors can contact students in their courses
            var courseIds = await _context.Courses
                .Where(c => c.InstructorId == userId)
                .Select(c => c.Id)
                .ToListAsync();

            var students = await _context.Enrollments
                .Include(e => e.Student)
                .Include(e => e.Course)
                .Where(e => courseIds.Contains(e.CourseId) && e.IsActive)
                .Select(e => new ChatContactDto(
                    e.Student.Id,
                    e.Student.FirstName + " " + e.Student.LastName,
                    e.Student.ProfilePictureUrl,
                    e.Student.Role,
                    e.Course.Name
                ))
                .Distinct()
                .ToListAsync();

            contacts = students;
        }

        return ApiResponse<List<ChatContactDto>>.SuccessResponse(contacts);
    }

    public async Task<ApiResponse> MarkAsReadAsync(Guid userId, MarkMessagesReadRequest request)
    {
        var messages = await _context.ChatMessages
            .Where(m => m.ReceiverId == userId && m.SenderId == request.SenderId && !m.IsRead)
            .ToListAsync();

        foreach (var message in messages)
        {
            message.IsRead = true;
            message.ReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return ApiResponse.SuccessResponse("Messages marked as read");
    }

    public async Task<ApiResponse<int>> GetUnreadCountAsync(Guid userId)
    {
        var count = await _context.ChatMessages
            .CountAsync(m => m.ReceiverId == userId && !m.IsRead);

        return ApiResponse<int>.SuccessResponse(count);
    }

    private async Task<ChatMessageDto?> GetMessageDtoAsync(Guid messageId)
    {
        var message = await _context.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.Receiver)
            .Include(m => m.Course)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        return message == null ? null : MapToDto(message);
    }

    private ChatMessageDto MapToDto(ChatMessage message)
    {
        return new ChatMessageDto(
            message.Id,
            message.SenderId,
            message.Sender?.FullName ?? "",
            message.Sender?.ProfilePictureUrl,
            message.ReceiverId,
            message.Receiver?.FullName ?? "",
            message.Content,
            message.IsRead,
            message.CreatedAt,
            message.CourseId,
            message.Course?.Name
        );
    }
}
