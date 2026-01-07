using Sms.Domain.Enums;

namespace Sms.Application.DTOs.Assignment;

public record CreateAssignmentRequest(
    string Title,
    string? Description,
    DateTime DueDate,
    int MaxScore,
    string? AllowedFileTypes,
    Guid CourseId
);

public record UpdateAssignmentRequest(
    string? Title,
    string? Description,
    DateTime? DueDate,
    int? MaxScore,
    string? AllowedFileTypes,
    bool? IsActive
);

public record AssignmentDto(
    Guid Id,
    string Title,
    string? Description,
    DateTime DueDate,
    int MaxScore,
    string? AllowedFileTypes,
    bool IsActive,
    Guid CourseId,
    string CourseName,
    Guid CreatedById,
    string CreatedByName,
    int SubmissionCount,
    DateTime CreatedAt
);

public record AssignmentListDto(
    Guid Id,
    string Title,
    DateTime DueDate,
    int MaxScore,
    Guid CourseId,
    string CourseName,
    int SubmissionCount,
    SubmissionStatus? MySubmissionStatus,
    decimal? MyScore  // Student's score if graded
);

public record SubmissionDto(
    Guid Id,
    Guid AssignmentId,
    string AssignmentTitle,
    Guid StudentId,
    string StudentName,
    string FileName,
    string? FileUrl,  // Path for downloading the submission file
    long FileSizeBytes,
    DateTime SubmittedAt,
    SubmissionStatus Status,
    decimal? Score,
    string? Feedback
);

public record GradeSubmissionRequest(
    decimal Score,
    string? Feedback
);
