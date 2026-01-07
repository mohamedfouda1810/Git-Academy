using Sms.Application.DTOs.Auth;
using Sms.Application.DTOs.Common;
using Sms.Domain.Enums;

namespace Sms.Application.Interfaces;

public interface IUserService
{
    Task<ApiResponse<UserDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<PagedResponse<UserDto>>> GetUsersAsync(PagedRequest request, UserRole? role = null);
    Task<ApiResponse<UserDto>> UpdateAsync(Guid id, UpdateUserRequest request);
    Task<ApiResponse> DeleteAsync(Guid id);
    Task<ApiResponse<List<UserDto>>> GetInstructorsAsync();
    Task<ApiResponse<List<UserDto>>> GetStudentsAsync();
}

public record UpdateUserRequest(
    string? FirstName,
    string? LastName,
    string? ProfilePictureUrl,
    bool? IsActive
);
