using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Sms.Application.DTOs.Auth;
using Sms.Application.DTOs.Common;
using Sms.Application.Interfaces;
using Sms.Domain.Entities;
using Sms.Domain.Enums;
using Sms.Infrastructure.Data;

namespace Sms.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;

    public UserService(UserManager<ApplicationUser> userManager, ApplicationDbContext context)
    {
        _userManager = userManager;
        _context = context;
    }

    public async Task<ApiResponse<UserDto>> GetByIdAsync(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
            return ApiResponse<UserDto>.FailResponse("User not found");

        return ApiResponse<UserDto>.SuccessResponse(MapToDto(user));
    }

    public async Task<ApiResponse<PagedResponse<UserDto>>> GetUsersAsync(PagedRequest request, UserRole? role = null)
    {
        var query = _userManager.Users.AsQueryable();

        if (role.HasValue)
        {
            query = query.Where(u => u.Role == role.Value);
        }

        if (!string.IsNullOrEmpty(request.SearchTerm))
        {
            query = query.Where(u => 
                u.FirstName.Contains(request.SearchTerm) || 
                u.LastName.Contains(request.SearchTerm) || 
                u.Email!.Contains(request.SearchTerm));
        }

        var totalCount = await query.CountAsync();
        var users = await query
            .OrderBy(u => u.LastName)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        var dtos = users.Select(MapToDto).ToList();

        return ApiResponse<PagedResponse<UserDto>>.SuccessResponse(
            new PagedResponse<UserDto>(
                dtos,
                totalCount,
                request.Page,
                request.PageSize,
                (int)Math.Ceiling(totalCount / (double)request.PageSize)
            ));
    }

    public async Task<ApiResponse<UserDto>> UpdateAsync(Guid id, UpdateUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
            return ApiResponse<UserDto>.FailResponse("User not found");

        if (request.FirstName != null) user.FirstName = request.FirstName;
        if (request.LastName != null) user.LastName = request.LastName;
        if (request.ProfilePictureUrl != null) user.ProfilePictureUrl = request.ProfilePictureUrl;
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return ApiResponse<UserDto>.FailResponse("Failed to update user");

        return ApiResponse<UserDto>.SuccessResponse(MapToDto(user));
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
            return ApiResponse.FailResponse("User not found");

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return ApiResponse.FailResponse("Failed to delete user");

        return ApiResponse.SuccessResponse("User deleted successfully");
    }

    public async Task<ApiResponse<List<UserDto>>> GetInstructorsAsync()
    {
        var instructors = await _userManager.Users
            .Where(u => u.Role == UserRole.Instructor)
            .ToListAsync();

        return ApiResponse<List<UserDto>>.SuccessResponse(instructors.Select(MapToDto).ToList());
    }

    public async Task<ApiResponse<List<UserDto>>> GetStudentsAsync()
    {
        var students = await _userManager.Users
            .Where(u => u.Role == UserRole.Student)
            .ToListAsync();

        return ApiResponse<List<UserDto>>.SuccessResponse(students.Select(MapToDto).ToList());
    }

    private static UserDto MapToDto(ApplicationUser user)
    {
        return new UserDto(
            user.Id,
            user.Email!,
            user.FirstName,
            user.LastName,
            user.Role,
            user.ProfilePictureUrl,
            user.EmailConfirmed
        );
    }
}
