namespace Sms.Application.DTOs.Common;

public record PagedRequest(
    int Page = 1,
    int PageSize = 10,
    string? SearchTerm = null,
    string? SortBy = null,
    bool SortDescending = false
);

public record PagedResponse<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

public record ApiResponse<T>(
    bool Success,
    string? Message,
    T? Data,
    List<string>? Errors
)
{
    public static ApiResponse<T> SuccessResponse(T data, string? message = null) =>
        new(true, message, data, null);
    
    public static ApiResponse<T> FailResponse(string message, List<string>? errors = null) =>
        new(false, message, default, errors);
}

public record ApiResponse(
    bool Success,
    string? Message,
    List<string>? Errors
)
{
    public static ApiResponse SuccessResponse(string? message = null) =>
        new(true, message, null);
    
    public static ApiResponse FailResponse(string message, List<string>? errors = null) =>
        new(false, message, errors);
}
