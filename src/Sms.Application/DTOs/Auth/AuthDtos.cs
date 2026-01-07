using Sms.Domain.Enums;

namespace Sms.Application.DTOs.Auth;

// Student registration - no role selection (defaults to Student)
public record RegisterRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName
);

// Admin-only: Create instructor account
public record CreateInstructorRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName
);

// Admin-only: Create any user with specified role
public record CreateUserRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    UserRole Role
);

public record LoginRequest(
    string Email,
    string Password
);

public record GoogleLoginRequest(
    string IdToken
);

public record RefreshTokenRequest(
    string AccessToken,
    string RefreshToken
);

public record VerifyEmailRequest(
    string UserId,
    string Token
);

public record ResendVerificationRequest(
    string Email
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record UserDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    UserRole Role,
    string? ProfilePictureUrl,
    bool EmailConfirmed
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);

public record ForgotPasswordRequest(
    string Email
);

public record ResetPasswordRequest(
    string Email,
    string Token,
    string NewPassword
);
