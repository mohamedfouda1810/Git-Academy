using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Sms.Application.DTOs.Auth;
using Sms.Application.DTOs.Common;
using Sms.Application.Interfaces;
using Sms.Domain.Entities;
using Sms.Domain.Enums;
using Sms.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Sms.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;
    private readonly ApplicationDbContext _context;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration,
        IEmailService emailService,
        ILogger<AuthService> logger,
        ApplicationDbContext context)
    {
        _userManager = userManager;
        _configuration = configuration;
        _emailService = emailService;
        _logger = logger;
        _context = context;
    }

    public async Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
            return ApiResponse<AuthResponse>.FailResponse("Email already registered");

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = UserRole.Student, // Always default to Student
            EmailConfirmed = false // Require email verification
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToList();
            return ApiResponse<AuthResponse>.FailResponse("Registration failed", errors);
        }

        // Add to Student role
        await _userManager.AddToRoleAsync(user, UserRole.Student.ToString());

        // Send verification email
        await SendVerificationEmailAsync(user);

        _logger.LogInformation("New student registered: {Email}", user.Email);

        // Return success but note that verification is required
        return ApiResponse<AuthResponse>.SuccessResponse(null!, 
            "Registration successful! Please check your email to verify your account.");
    }

    public async Task<ApiResponse<AuthResponse>> CreateInstructorAsync(CreateInstructorRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
            return ApiResponse<AuthResponse>.FailResponse("Email already registered");

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = UserRole.Instructor,
            EmailConfirmed = true // Admin-created accounts are pre-verified
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToList();
            return ApiResponse<AuthResponse>.FailResponse("Failed to create instructor", errors);
        }

        // Add to Instructor role
        await _userManager.AddToRoleAsync(user, UserRole.Instructor.ToString());

        _logger.LogInformation("New instructor created by admin: {Email}", user.Email);

        // Send welcome email
        try
        {
            await _emailService.SendWelcomeEmailAsync(user.Email!, user.FullName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send welcome email to instructor {Email}", user.Email);
        }

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<ApiResponse<UserDto>> CreateUserAsync(CreateUserRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
            return ApiResponse<UserDto>.FailResponse("Email already registered");

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = request.Role,
            EmailConfirmed = true // Admin-created accounts are pre-verified
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToList();
            return ApiResponse<UserDto>.FailResponse("Failed to create user", errors);
        }

        // Add to role
        await _userManager.AddToRoleAsync(user, request.Role.ToString());

        _logger.LogInformation("New user created by admin: {Email} with role {Role}", user.Email, request.Role);

        // Send welcome email
        try
        {
            await _emailService.SendWelcomeEmailAsync(user.Email!, user.FullName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send welcome email to {Email}", user.Email);
        }

        return ApiResponse<UserDto>.SuccessResponse(new UserDto(
            user.Id,
            user.Email!,
            user.FirstName,
            user.LastName,
            user.Role,
            user.ProfilePictureUrl,
            user.EmailConfirmed
        ));
    }

    public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
            return ApiResponse<AuthResponse>.FailResponse("Invalid email or password");

        if (!user.IsActive)
            return ApiResponse<AuthResponse>.FailResponse("Account is deactivated");

        // Check email verification
        if (!user.EmailConfirmed)
            return ApiResponse<AuthResponse>.FailResponse("Please verify your email before logging in. Check your inbox for the verification link.");

        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        _logger.LogInformation("User logged in: {Email}", user.Email);

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<ApiResponse> VerifyEmailAsync(VerifyEmailRequest request)
    {
        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null)
            return ApiResponse.FailResponse("Invalid verification link");

        var result = await _userManager.ConfirmEmailAsync(user, request.Token);
        
        if (!result.Succeeded)
        {
            _logger.LogWarning("Email verification failed for user {UserId}", request.UserId);
            return ApiResponse.FailResponse("Invalid or expired verification link");
        }

        _logger.LogInformation("Email verified for user: {Email}", user.Email);

        // Send welcome email after verification
        try
        {
            await _emailService.SendWelcomeEmailAsync(user.Email!, user.FullName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send welcome email to {Email}", user.Email);
        }

        return ApiResponse.SuccessResponse("Email verified successfully! You can now log in.");
    }

    public async Task<ApiResponse> ResendVerificationEmailAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return ApiResponse.SuccessResponse("If the email exists, a verification link has been sent.");

        if (user.EmailConfirmed)
            return ApiResponse.FailResponse("Email is already verified");

        await SendVerificationEmailAsync(user);

        return ApiResponse.SuccessResponse("Verification email sent. Please check your inbox.");
    }

    public async Task<ApiResponse> ForgotPasswordAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return ApiResponse.SuccessResponse("If the email exists, a password reset link has been sent.");

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = HttpUtility.UrlEncode(token);
        var frontendUrl = _configuration["FrontendUrl"] ?? "http://localhost:5173";
        var resetLink = $"{frontendUrl}/reset-password?email={HttpUtility.UrlEncode(email)}&token={encodedToken}";

        try
        {
            await _emailService.SendPasswordResetEmailAsync(user.Email!, resetLink);
            _logger.LogInformation("Password reset email sent to: {Email}", email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", email);
        }

        return ApiResponse.SuccessResponse("If the email exists, a password reset link has been sent.");
    }

    public async Task<ApiResponse> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return ApiResponse.FailResponse("Invalid request");

        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);

        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToList();
            return ApiResponse.FailResponse("Password reset failed", errors);
        }

        _logger.LogInformation("Password reset successful for: {Email}", request.Email);
        return ApiResponse.SuccessResponse("Password reset successful. You can now log in with your new password.");
    }

    public async Task<ApiResponse<AuthResponse>> GoogleLoginAsync(GoogleLoginRequest request)
    {
        var payload = await ValidateGoogleTokenAsync(request.IdToken);
        if (payload == null)
            return ApiResponse<AuthResponse>.FailResponse("Invalid Google token");

        var user = await _userManager.FindByEmailAsync(payload.Email);
        
        if (user == null)
        {
            // Create new user from Google account
            user = new ApplicationUser
            {
                UserName = payload.Email,
                Email = payload.Email,
                FirstName = payload.GivenName ?? "User",
                LastName = payload.FamilyName ?? "",
                GoogleId = payload.Subject,
                ProfilePictureUrl = payload.Picture,
                Role = UserRole.Student, // Default role for new Google users
                EmailConfirmed = true // Google already verified the email
            };

            var result = await _userManager.CreateAsync(user);
            if (!result.Succeeded)
                return ApiResponse<AuthResponse>.FailResponse("Failed to create account");

            await _userManager.AddToRoleAsync(user, UserRole.Student.ToString());

            // Send welcome email
            try
            {
                await _emailService.SendWelcomeEmailAsync(user.Email!, user.FullName);
            }
            catch { }
        }
        else
        {
            if (string.IsNullOrEmpty(user.GoogleId))
            {
                user.GoogleId = payload.Subject;
                user.ProfilePictureUrl ??= payload.Picture;
                await _userManager.UpdateAsync(user);
            }
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<ApiResponse<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request)
    {
        var principal = GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null)
            return ApiResponse<AuthResponse>.FailResponse("Invalid access token");

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return ApiResponse<AuthResponse>.FailResponse("Invalid token claims");

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || user.RefreshToken != request.RefreshToken || 
            user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            return ApiResponse<AuthResponse>.FailResponse("Invalid refresh token");

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<ApiResponse> ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            return ApiResponse.FailResponse("User not found");

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToList();
            return ApiResponse.FailResponse("Password change failed", errors);
        }

        return ApiResponse.SuccessResponse("Password changed successfully");
    }

    public async Task<ApiResponse> LogoutAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            return ApiResponse.FailResponse("User not found");

        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;
        await _userManager.UpdateAsync(user);

        return ApiResponse.SuccessResponse("Logged out successfully");
    }

    public async Task<string> GenerateAccessTokenAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.GivenName, user.FirstName),
            new(ClaimTypes.Surname, user.LastName),
            new("role", user.Role.ToString())
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT secret not configured")));
        
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60")),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public Task<string> GenerateRefreshTokenAsync()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Task.FromResult(Convert.ToBase64String(randomBytes));
    }

    private async Task SendVerificationEmailAsync(ApplicationUser user)
    {
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var encodedToken = HttpUtility.UrlEncode(token);
        var frontendUrl = _configuration["FrontendUrl"] ?? "http://localhost:5173";
        var verificationLink = $"{frontendUrl}/verify-email?userId={user.Id}&token={encodedToken}";

        try
        {
            await _emailService.SendVerificationEmailAsync(user.Email!, user.FullName, verificationLink);
            _logger.LogInformation("Verification email sent to: {Email}", user.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {Email}", user.Email);
        }
    }

    private async Task<ApiResponse<AuthResponse>> GenerateAuthResponseAsync(ApplicationUser user)
    {
        var accessToken = await GenerateAccessTokenAsync(user);
        var refreshToken = await GenerateRefreshTokenAsync();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _userManager.UpdateAsync(user);

        var response = new AuthResponse(
            accessToken,
            refreshToken,
            DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60")),
            new UserDto(
                user.Id,
                user.Email!,
                user.FirstName,
                user.LastName,
                user.Role,
                user.ProfilePictureUrl,
                user.EmailConfirmed
            )
        );

        return ApiResponse<AuthResponse>.SuccessResponse(response);
    }

    private ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = true,
            ValidateIssuer = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration["Jwt:Secret"]!)),
            ValidateLifetime = false,
            ValidIssuer = _configuration["Jwt:Issuer"],
            ValidAudience = _configuration["Jwt:Audience"]
        };

        try
        {
            var principal = new JwtSecurityTokenHandler()
                .ValidateToken(token, tokenValidationParameters, out var securityToken);

            if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, 
                    StringComparison.InvariantCultureIgnoreCase))
                return null;

            return principal;
        }
        catch
        {
            return null;
        }
    }

    private async Task<GooglePayload?> ValidateGoogleTokenAsync(string idToken)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(idToken);
            
            var payload = new GooglePayload
            {
                Subject = token.Claims.FirstOrDefault(c => c.Type == "sub")?.Value ?? "",
                Email = token.Claims.FirstOrDefault(c => c.Type == "email")?.Value ?? "",
                EmailVerified = bool.Parse(token.Claims.FirstOrDefault(c => c.Type == "email_verified")?.Value ?? "false"),
                GivenName = token.Claims.FirstOrDefault(c => c.Type == "given_name")?.Value,
                FamilyName = token.Claims.FirstOrDefault(c => c.Type == "family_name")?.Value,
                Picture = token.Claims.FirstOrDefault(c => c.Type == "picture")?.Value
            };

            return await Task.FromResult(payload);
        }
        catch
        {
            return null;
        }
    }

    public async Task<ApiResponse<List<UserDto>>> GetAllUsersAsync()
    {
        var users = _userManager.Users.ToList();
        
        var userDtos = users.Select(u => new UserDto(
            u.Id,
            u.Email!,
            u.FirstName,
            u.LastName,
            u.Role,
            u.ProfilePictureUrl,
            u.EmailConfirmed
        )).ToList();
        
        return ApiResponse<List<UserDto>>.SuccessResponse(userDtos);
    }

    public async Task<ApiResponse> DeleteUserAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            return ApiResponse.FailResponse("User not found");
        
        _logger.LogInformation("Deleting user: {Email} (ID: {UserId})", user.Email, userId);

        try
        {
            // Start a transaction for data integrity
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            // 1. Delete user's quiz attempts
            var quizAttempts = await _context.QuizAttempts
                .Where(qa => qa.StudentId == userId)
                .ToListAsync();
            _context.QuizAttempts.RemoveRange(quizAttempts);
            
            // 2. Delete user's assignment submissions
            var submissions = await _context.AssignmentSubmissions
                .Where(s => s.StudentId == userId)
                .ToListAsync();
            _context.AssignmentSubmissions.RemoveRange(submissions);
            
            // 3. Delete user's enrollments
            var enrollments = await _context.Enrollments
                .Where(e => e.StudentId == userId)
                .ToListAsync();
            _context.Enrollments.RemoveRange(enrollments);
            
            // 4. Delete user's notifications
            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId)
                .ToListAsync();
            _context.Notifications.RemoveRange(notifications);
            
            // 5. Delete user's chat messages (sent and received)
            var chatMessages = await _context.ChatMessages
                .Where(m => m.SenderId == userId || m.ReceiverId == userId)
                .ToListAsync();
            _context.ChatMessages.RemoveRange(chatMessages);
            
            // 6. For instructors: delete courses they created and related data
            var instructorCourses = await _context.Courses
                .Where(c => c.InstructorId == userId)
                .Include(c => c.Sessions)
                    .ThenInclude(s => s.Quiz)
                .Include(c => c.Enrollments)
                .Include(c => c.Assignments)
                    .ThenInclude(a => a.Submissions)
                .Include(c => c.Quizzes)
                    .ThenInclude(q => q.Attempts)
                .ToListAsync();

            foreach (var course in instructorCourses)
            {
                // Delete quiz attempts for course quizzes
                foreach (var quiz in course.Quizzes)
                {
                    _context.QuizAttempts.RemoveRange(quiz.Attempts);
                }
                _context.Quizzes.RemoveRange(course.Quizzes);
                
                // Delete assignment submissions
                foreach (var assignment in course.Assignments)
                {
                    _context.AssignmentSubmissions.RemoveRange(assignment.Submissions);
                }
                _context.Assignments.RemoveRange(course.Assignments);
                
                // Delete session quizzes
                foreach (var session in course.Sessions)
                {
                    if (session.Quiz != null)
                    {
                        var sessionQuizAttempts = await _context.QuizAttempts
                            .Where(qa => qa.QuizId == session.Quiz.Id)
                            .ToListAsync();
                        _context.QuizAttempts.RemoveRange(sessionQuizAttempts);
                        _context.Quizzes.Remove(session.Quiz);
                    }
                }
                _context.Sessions.RemoveRange(course.Sessions);
                
                // Delete course enrollments
                _context.Enrollments.RemoveRange(course.Enrollments);
                
                // Delete payments for this course
                var coursePayments = await _context.Payments
                    .Where(p => p.CourseId == course.Id)
                    .ToListAsync();
                _context.Payments.RemoveRange(coursePayments);
            }
            
            // Delete courses themselves
            _context.Courses.RemoveRange(instructorCourses);
            
            // Also delete any payments made by this user
            var userPayments = await _context.Payments
                .Where(p => p.UserId == userId)
                .ToListAsync();
            _context.Payments.RemoveRange(userPayments);
            
            await _context.SaveChangesAsync();
            
            // Now delete the user
            var result = await _userManager.DeleteAsync(user);
            
            if (!result.Succeeded)
            {
                await transaction.RollbackAsync();
                var errors = result.Errors.Select(e => e.Description).ToList();
                return ApiResponse.FailResponse("Failed to delete user", errors);
            }
            
            await transaction.CommitAsync();
            
            _logger.LogInformation("User deleted successfully: {Email}", user.Email);
            return ApiResponse.SuccessResponse($"User {user.Email} deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user {UserId}", userId);
            return ApiResponse.FailResponse($"Failed to delete user: {ex.Message}");
        }
    }

    private class GooglePayload
    {
        public string Subject { get; set; } = "";
        public string Email { get; set; } = "";
        public bool EmailVerified { get; set; }
        public string? GivenName { get; set; }
        public string? FamilyName { get; set; }
        public string? Picture { get; set; }
    }
}
