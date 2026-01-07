namespace Sms.Application.Interfaces;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body, bool isHtml = true);
    Task SendWelcomeEmailAsync(string to, string userName);
    Task SendVerificationEmailAsync(string to, string userName, string verificationLink);
    Task SendQuizNotificationAsync(string to, string userName, string quizTitle, DateTime startTime);
    Task SendAssignmentDueNotificationAsync(string to, string userName, string assignmentTitle, DateTime dueDate);
    Task SendGradeNotificationAsync(string to, string userName, string itemTitle, decimal score);
    Task SendPasswordResetEmailAsync(string to, string resetLink);
    Task SendCourseEnrollmentEmailAsync(string to, string userName, string courseName);
    Task SendPaymentConfirmationEmailAsync(string to, string userName, string courseName, decimal amount);
}
