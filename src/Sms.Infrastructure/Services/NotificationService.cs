using Microsoft.EntityFrameworkCore;
using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Notification;
using Sms.Application.Interfaces;
using Sms.Domain.Entities;
using Sms.Domain.Enums;
using Sms.Infrastructure.Data;

namespace Sms.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;

    public NotificationService(ApplicationDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    public async Task<ApiResponse<List<NotificationDto>>> GetNotificationsAsync(Guid userId, bool unreadOnly = false)
    {
        var query = _context.Notifications.Where(n => n.UserId == userId);
        
        if (unreadOnly)
            query = query.Where(n => !n.IsRead);

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationDto(
                n.Id,
                n.Title,
                n.Message,
                n.Type,
                n.IsRead,
                n.ReferenceId,
                n.ReferenceType,
                n.CreatedAt
            ))
            .ToListAsync();

        return ApiResponse<List<NotificationDto>>.SuccessResponse(notifications);
    }

    public async Task<ApiResponse<int>> GetUnreadCountAsync(Guid userId)
    {
        var count = await _context.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);

        return ApiResponse<int>.SuccessResponse(count);
    }

    public async Task<ApiResponse> MarkAsReadAsync(Guid notificationId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification == null)
            return ApiResponse.FailResponse("Notification not found");

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return ApiResponse.SuccessResponse("Notification marked as read");
    }

    public async Task<ApiResponse> MarkAllAsReadAsync(Guid userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return ApiResponse.SuccessResponse("All notifications marked as read");
    }

    public async Task<ApiResponse> DeleteAsync(Guid notificationId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification == null)
            return ApiResponse.FailResponse("Notification not found");

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();

        return ApiResponse.SuccessResponse("Notification deleted");
    }

    public async Task CreateNotificationAsync(CreateNotificationRequest request)
    {
        var notification = new Notification
        {
            UserId = request.UserId,
            Title = request.Title,
            Message = request.Message,
            Type = request.Type,
            ReferenceId = request.ReferenceId,
            ReferenceType = request.ReferenceType
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        // Send email if requested
        if (request.SendEmail)
        {
            var user = await _context.Users.FindAsync(request.UserId);
            if (user?.Email != null)
            {
                try
                {
                    await _emailService.SendEmailAsync(user.Email, request.Title, request.Message);
                    notification.EmailSent = true;
                    notification.EmailSentAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
                catch { /* Log but don't fail */ }
            }
        }
    }

    public async Task NotifyQuizAvailableAsync(Guid courseId, Guid quizId, string quizTitle)
    {
        var enrolledStudents = await _context.Enrollments
            .Include(e => e.Student)
            .Where(e => e.CourseId == courseId && e.IsActive)
            .ToListAsync();

        foreach (var enrollment in enrolledStudents)
        {
            await CreateNotificationAsync(new CreateNotificationRequest(
                enrollment.StudentId,
                "New Quiz Available",
                $"A new quiz '{quizTitle}' is now available. Don't miss it!",
                NotificationType.QuizAvailable,
                quizId.ToString(),
                "Quiz",
                true
            ));
        }
    }

    public async Task NotifyAssignmentDueAsync(Guid courseId, Guid assignmentId, string assignmentTitle, DateTime dueDate)
    {
        var enrolledStudents = await _context.Enrollments
            .Include(e => e.Student)
            .Where(e => e.CourseId == courseId && e.IsActive)
            .ToListAsync();

        foreach (var enrollment in enrolledStudents)
        {
            await CreateNotificationAsync(new CreateNotificationRequest(
                enrollment.StudentId,
                "Assignment Due Soon",
                $"Assignment '{assignmentTitle}' is due on {dueDate:g}. Make sure to submit before the deadline!",
                NotificationType.AssignmentDue,
                assignmentId.ToString(),
                "Assignment",
                true
            ));
        }
    }

    public async Task NotifyNewMessageAsync(Guid receiverId, string senderName)
    {
        await CreateNotificationAsync(new CreateNotificationRequest(
            receiverId,
            "New Message",
            $"You have a new message from {senderName}",
            NotificationType.NewMessage,
            null,
            "Message",
            false // Don't email for every message
        ));
    }

    public async Task NotifyGradePostedAsync(Guid studentId, string courseName, string itemTitle, decimal score)
    {
        var student = await _context.Users.FindAsync(studentId);
        await CreateNotificationAsync(new CreateNotificationRequest(
            studentId,
            "Grade Posted",
            $"Your grade for '{itemTitle}' in {courseName} has been posted: {score:F1}",
            NotificationType.GradePosted,
            null,
            "Grade",
            true
        ));

        // Also send email
        if (student?.Email != null)
        {
            try
            {
                await _emailService.SendGradeNotificationAsync(student.Email, student.FullName, itemTitle, score);
            }
            catch { }
        }
    }

    public async Task NotifyNewSessionAsync(Guid courseId, Guid sessionId, string sessionTitle)
    {
        var course = await _context.Courses.FindAsync(courseId);
        var courseName = course?.Name ?? "your course";

        var enrolledStudents = await _context.Enrollments
            .Include(e => e.Student)
            .Where(e => e.CourseId == courseId && e.IsActive)
            .ToListAsync();

        foreach (var enrollment in enrolledStudents)
        {
            await CreateNotificationAsync(new CreateNotificationRequest(
                enrollment.StudentId,
                "New Session Available",
                $"A new session '{sessionTitle}' has been added to {courseName}. Check it out now!",
                NotificationType.CourseUpdate,
                sessionId.ToString(),
                "Session",
                true
            ));
        }
    }
}
