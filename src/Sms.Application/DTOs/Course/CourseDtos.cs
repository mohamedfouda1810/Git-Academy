namespace Sms.Application.DTOs.Course;

// Filter options for course search
public record CourseFilterRequest(
    int Page = 1,
    int PageSize = 10,
    string? SearchTerm = null,
    string? Semester = null,
    int? Year = null,
    decimal? MinPrice = null,
    decimal? MaxPrice = null,
    Guid? InstructorId = null,
    bool? IsActive = null
);

public record CreateCourseRequest(
    string Code,
    string Name,
    string? Description,
    string? PreviewDescription,
    int Credits,
    string Semester,
    int Year,
    decimal Price,
    Guid InstructorId
);

public record UpdateCourseRequest(
    string? Name,
    string? Description,
    string? PreviewDescription,
    string? ThumbnailUrl,
    int? Credits,
    string? Semester,
    int? Year,
    decimal? Price,
    bool? IsActive
);

// Full course DTO for admin/instructor views
public record CourseDto(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    string? PreviewDescription,
    string? ThumbnailUrl,
    int Credits,
    string Semester,
    int Year,
    decimal Price,
    bool IsActive,
    Guid InstructorId,
    string InstructorName,
    int EnrollmentCount,
    int SessionCount,
    DateTime CreatedAt
);

// List DTO for paginated results
public record CourseListDto(
    Guid Id,
    string Code,
    string Name,
    int Credits,
    string Semester,
    int Year,
    decimal Price,
    string InstructorName,
    int EnrollmentCount,
    int SessionCount
);

// Preview DTO for unpurchased courses
public record CoursePreviewDto(
    Guid Id,
    string Code,
    string Name,
    string? PreviewDescription,
    string? ThumbnailUrl,
    decimal Price,
    string InstructorName,
    int SessionCount,
    int EnrollmentCount
);

// Full details DTO for purchased courses
public record CourseDetailsDto(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    decimal Price,
    Guid InstructorId,
    string InstructorName,
    int Credits,
    string Semester,
    int Year,
    int EnrollmentCount,
    bool HasAccess,
    bool IsEnrolled,
    bool HasPaid,
    List<SessionSummaryDto>? Sessions
);

public record SessionSummaryDto(
    Guid Id,
    string Title,
    string Description,
    int Order,
    bool HasPdf,
    bool HasVideo,
    bool HasQuiz
);

// Enrollment DTOs
public record EnrollmentRequest(
    Guid CourseId
);

public record EnrollmentDto(
    Guid Id,
    Guid StudentId,
    string StudentName,
    Guid CourseId,
    string CourseName,
    DateTime EnrolledAt,
    decimal? FinalGrade,
    bool IsActive
);
