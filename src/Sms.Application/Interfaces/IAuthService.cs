using Sms.Application.DTOs.Auth;
using Sms.Application.DTOs.Common;
using Sms.Domain.Entities;

namespace Sms.Application.Interfaces;

public interface IAuthService
{
    // Student registration (defaults to Student role)
    Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request);
    
    // Admin-only: Create instructor
    Task<ApiResponse<AuthResponse>> CreateInstructorAsync(CreateInstructorRequest request);
    
    // Admin-only: Create any user with specified role
    Task<ApiResponse<UserDto>> CreateUserAsync(CreateUserRequest request);
    
    // Login
    Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request);
    Task<ApiResponse<AuthResponse>> GoogleLoginAsync(GoogleLoginRequest request);
    Task<ApiResponse<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request);
    
    // Email verification
    Task<ApiResponse> VerifyEmailAsync(VerifyEmailRequest request);
    Task<ApiResponse> ResendVerificationEmailAsync(string email);
    
    // Password management
    Task<ApiResponse> ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
    Task<ApiResponse> ForgotPasswordAsync(string email);
    Task<ApiResponse> ResetPasswordAsync(ResetPasswordRequest request);
    
    // Session management
    Task<ApiResponse> LogoutAsync(Guid userId);
    
    // Token generation
    Task<string> GenerateAccessTokenAsync(ApplicationUser user);
    Task<string> GenerateRefreshTokenAsync();
    
    // Admin-only: User management
    Task<ApiResponse<List<UserDto>>> GetAllUsersAsync();
    Task<ApiResponse> DeleteUserAsync(Guid userId);
}
