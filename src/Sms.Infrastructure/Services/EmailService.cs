using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using Sms.Application.Interfaces;

namespace Sms.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly string _platformName = "Online Courses Platform";

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string body, bool isHtml = true)
    {
        try
        {
            var email = new MimeMessage();
            email.From.Add(MailboxAddress.Parse(_configuration["Email:From"]));
            email.To.Add(MailboxAddress.Parse(to));
            email.Subject = subject;

            var builder = new BodyBuilder();
            if (isHtml)
                builder.HtmlBody = body;
            else
                builder.TextBody = body;

            email.Body = builder.ToMessageBody();

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(
                _configuration["Email:SmtpHost"],
                int.Parse(_configuration["Email:SmtpPort"] ?? "587"),
                SecureSocketOptions.StartTls);

            await smtp.AuthenticateAsync(
                _configuration["Email:Username"],
                _configuration["Email:Password"]);

            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);

            _logger.LogInformation("Email sent successfully to {To}", to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
            throw;
        }
    }

    public async Task SendVerificationEmailAsync(string to, string userName, string verificationLink)
    {
        var subject = $"Verify Your Email - {_platformName}";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;'>
                    <h1 style='color: white; margin: 0;'>📧 Verify Your Email</h1>
                </div>
                <div style='padding: 30px; background: #f8f9fa;'>
                    <h2 style='color: #333;'>Hello {userName},</h2>
                    <p style='color: #666; line-height: 1.6;'>
                        Thank you for registering with {_platformName}! Please verify your email address to activate your account.
                    </p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{verificationLink}' style='background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;'>
                            Verify Email Address
                        </a>
                    </div>
                    <p style='color: #999; font-size: 12px;'>
                        This link will expire in 24 hours. If you didn't create an account, please ignore this email.
                    </p>
                </div>
                <div style='padding: 20px; text-align: center; color: #999; font-size: 12px;'>
                    <p>&copy; 2024 {_platformName}. All rights reserved.</p>
                </div>
            </body>
            </html>";

        await SendEmailAsync(to, subject, body);
    }

    public async Task SendWelcomeEmailAsync(string to, string userName)
    {
        var subject = $"Welcome to {_platformName}!";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;'>
                    <h1 style='color: white; margin: 0;'>🎓 Welcome to {_platformName}!</h1>
                </div>
                <div style='padding: 30px; background: #f8f9fa;'>
                    <h2 style='color: #333;'>Hello {userName},</h2>
                    <p style='color: #666; line-height: 1.6;'>
                        Your email has been verified! You can now access all features:
                    </p>
                    <ul style='color: #666;'>
                        <li>🎥 Browse and enroll in courses</li>
                        <li>📝 Take quizzes and submit assignments</li>
                        <li>💬 Chat with instructors</li>
                        <li>📊 Track your progress</li>
                        <li>🏆 Earn certificates</li>
                    </ul>
                    <div style='text-align: center; margin-top: 30px;'>
                        <a href='#' style='background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px;'>
                            Start Learning
                        </a>
                    </div>
                </div>
                <div style='padding: 20px; text-align: center; color: #999; font-size: 12px;'>
                    <p>&copy; 2024 {_platformName}. All rights reserved.</p>
                </div>
            </body>
            </html>";

        await SendEmailAsync(to, subject, body);
    }

    public async Task SendCourseEnrollmentEmailAsync(string to, string userName, string courseName)
    {
        var subject = $"Enrolled in: {courseName}";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: #10b981; padding: 20px; text-align: center;'>
                    <h1 style='color: white; margin: 0;'>✅ Enrollment Confirmed</h1>
                </div>
                <div style='padding: 30px; background: #f8f9fa;'>
                    <h2 style='color: #333;'>Hello {userName},</h2>
                    <p style='color: #666;'>You have been successfully enrolled in:</p>
                    <div style='background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;'>
                        <h3 style='color: #10b981; margin-top: 0;'>{courseName}</h3>
                    </div>
                    <p style='color: #666;'>You can now access all course materials, assignments, and quizzes.</p>
                </div>
            </body>
            </html>";

        await SendEmailAsync(to, subject, body);
    }

    public async Task SendPaymentConfirmationEmailAsync(string to, string userName, string courseName, decimal amount)
    {
        var subject = $"Payment Confirmed - {courseName}";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: #10b981; padding: 20px; text-align: center;'>
                    <h1 style='color: white; margin: 0;'>💳 Payment Successful</h1>
                </div>
                <div style='padding: 30px; background: #f8f9fa;'>
                    <h2 style='color: #333;'>Hello {userName},</h2>
                    <p style='color: #666;'>Your payment has been processed successfully!</p>
                    <div style='background: white; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                        <p style='margin: 5px 0;'><strong>Course:</strong> {courseName}</p>
                        <p style='margin: 5px 0;'><strong>Amount:</strong> ${amount:F2}</p>
                        <p style='margin: 5px 0;'><strong>Date:</strong> {DateTime.UtcNow:MMMM dd, yyyy}</p>
                    </div>
                    <p style='color: #666;'>You now have full access to this course.</p>
                </div>
            </body>
            </html>";

        await SendEmailAsync(to, subject, body);
    }

    public async Task SendQuizNotificationAsync(string to, string userName, string quizTitle, DateTime startTime)
    {
        var subject = $"New Quiz Available: {quizTitle}";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: #8b5cf6; padding: 20px; text-align: center;'>
                    <h1 style='color: white; margin: 0;'>📝 New Quiz Available</h1>
                </div>
                <div style='padding: 30px; background: #f8f9fa;'>
                    <h2 style='color: #333;'>Hello {userName},</h2>
                    <p style='color: #666;'>A new quiz is now available for you:</p>
                    <div style='background: white; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                        <h3 style='color: #8b5cf6; margin-top: 0;'>{quizTitle}</h3>
                        <p style='color: #666;'><strong>Starts:</strong> {startTime:MMMM dd, yyyy h:mm tt}</p>
                    </div>
                    <p style='color: #666;'>Don't forget to take the quiz before the deadline!</p>
                </div>
            </body>
            </html>";

        await SendEmailAsync(to, subject, body);
    }

    public async Task SendAssignmentDueNotificationAsync(string to, string userName, string assignmentTitle, DateTime dueDate)
    {
        var subject = $"Assignment Due Soon: {assignmentTitle}";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: #f59e0b; padding: 20px; text-align: center;'>
                    <h1 style='color: white; margin: 0;'>📚 Assignment Reminder</h1>
                </div>
                <div style='padding: 30px; background: #f8f9fa;'>
                    <h2 style='color: #333;'>Hello {userName},</h2>
                    <p style='color: #666;'>This is a reminder about your upcoming assignment:</p>
                    <div style='background: white; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                        <h3 style='color: #f59e0b; margin-top: 0;'>{assignmentTitle}</h3>
                        <p style='color: #666;'><strong>Due Date:</strong> {dueDate:MMMM dd, yyyy h:mm tt}</p>
                    </div>
                    <p style='color: #666;'>Make sure to submit your work before the deadline!</p>
                </div>
            </body>
            </html>";

        await SendEmailAsync(to, subject, body);
    }

    public async Task SendGradeNotificationAsync(string to, string userName, string itemTitle, decimal score)
    {
        var subject = $"Grade Posted: {itemTitle}";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: #3b82f6; padding: 20px; text-align: center;'>
                    <h1 style='color: white; margin: 0;'>🎓 Grade Posted</h1>
                </div>
                <div style='padding: 30px; background: #f8f9fa;'>
                    <h2 style='color: #333;'>Hello {userName},</h2>
                    <p style='color: #666;'>A new grade has been posted for:</p>
                    <div style='background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;'>
                        <h3 style='color: #3b82f6; margin-top: 0;'>{itemTitle}</h3>
                        <p style='font-size: 36px; color: #333; margin: 10px 0;'><strong>{score:F1}</strong></p>
                    </div>
                    <p style='color: #666;'>Log in to view more details and feedback.</p>
                </div>
            </body>
            </html>";

        await SendEmailAsync(to, subject, body);
    }

    public async Task SendPasswordResetEmailAsync(string to, string resetLink)
    {
        var subject = $"Password Reset - {_platformName}";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: #ef4444; padding: 20px; text-align: center;'>
                    <h1 style='color: white; margin: 0;'>🔐 Password Reset</h1>
                </div>
                <div style='padding: 30px; background: #f8f9fa;'>
                    <p style='color: #666;'>We received a request to reset your password.</p>
                    <p style='color: #666;'>Click the button below to reset your password:</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{resetLink}' style='background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;'>
                            Reset Password
                        </a>
                    </div>
                    <p style='color: #999; font-size: 12px;'>If you didn't request this, please ignore this email. This link expires in 1 hour.</p>
                </div>
            </body>
            </html>";

        await SendEmailAsync(to, subject, body);
    }
}
