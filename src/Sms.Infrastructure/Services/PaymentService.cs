using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Sms.Application.DTOs.Common;
using Sms.Application.Interfaces;
using Sms.Domain.Entities;
using Sms.Infrastructure.Data;
using Stripe;

namespace Sms.Infrastructure.Services;

public class PaymentService : IPaymentService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentService> _logger;
    private readonly string _webhookSecret;

    public PaymentService(
        ApplicationDbContext context, 
        IConfiguration configuration,
        ILogger<PaymentService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        
        StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];
        _webhookSecret = _configuration["Stripe:WebhookSecret"] ?? "";
    }

    public async Task<ApiResponse<Payment>> CreatePaymentIntentAsync(Guid userId, Guid courseId)
    {
        var course = await _context.Courses.FindAsync(courseId);
        if (course == null)
            return ApiResponse<Payment>.FailResponse("Course not found");

        if (course.Price <= 0)
            return ApiResponse<Payment>.FailResponse("Course does not require payment");

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return ApiResponse<Payment>.FailResponse("User not found");

        // Check if already enrolled or paid
        var existingEnrollment = await _context.Enrollments
            .AnyAsync(e => e.StudentId == userId && e.CourseId == courseId && e.IsActive);
        
        if (existingEnrollment)
            return ApiResponse<Payment>.FailResponse("Already enrolled in this course");

        try
        {
            var options = new PaymentIntentCreateOptions
            {
                Amount = (long)(course.Price * 100), // Convert to cents
                Currency = "usd",
                Metadata = new Dictionary<string, string>
                {
                    { "userId", userId.ToString() },
                    { "courseId", courseId.ToString() }
                },
                AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                {
                    Enabled = true,
                },
            };

            var service = new PaymentIntentService();
            var intent = await service.CreateAsync(options);

            var payment = new Payment
            {
                UserId = userId,
                CourseId = courseId,
                Amount = course.Price,
                Currency = "usd",
                StripePaymentIntentId = intent.Id,
                ClientSecret = intent.ClientSecret,
                Status = "pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.Set<Payment>().Add(payment);
            await _context.SaveChangesAsync();

            return ApiResponse<Payment>.SuccessResponse(payment);
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Stripe error creating payment intent");
            return ApiResponse<Payment>.FailResponse("Payment provider error");
        }
    }

    public async Task<ApiResponse> HandleWebhookAsync(string json, string signature)
    {
        try
        {
            var stripeEvent = EventUtility.ConstructEvent(json, signature, _webhookSecret);

            if (stripeEvent.Type == Events.PaymentIntentSucceeded)
            {
                var paymentIntent = stripeEvent.Data.Object as PaymentIntent;
                if (paymentIntent != null)
                {
                    await FulfillPaymentAsync(paymentIntent);
                }
            }

            return ApiResponse.SuccessResponse("Webhook processed");
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Webhook signature verification failed");
            return ApiResponse.FailResponse("Invalid signature");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing webhook");
            return ApiResponse.FailResponse("Processing error");
        }
    }

    public async Task<ApiResponse<List<Payment>>> GetUserPaymentsAsync(Guid userId)
    {
        var payments = await _context.Set<Payment>()
            .Include(p => p.Course)
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return ApiResponse<List<Payment>>.SuccessResponse(payments);
    }

    private async Task FulfillPaymentAsync(PaymentIntent intent)
    {
        var payment = await _context.Set<Payment>()
            .FirstOrDefaultAsync(p => p.StripePaymentIntentId == intent.Id);

        if (payment != null && payment.Status != "succeeded")
        {
            payment.Status = "succeeded";
            payment.CompletedAt = DateTime.UtcNow;

            // Automatically enroll student
            var enrollment = new Enrollment
            {
                StudentId = payment.UserId,
                CourseId = payment.CourseId,
                EnrolledAt = DateTime.UtcNow,
                IsActive = true
            };
            
            _context.Enrollments.Add(enrollment);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Payment {PaymentId} succeeded and user enrolled", payment.Id);
        }
    }
}
