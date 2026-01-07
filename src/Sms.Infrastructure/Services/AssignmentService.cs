using Microsoft.EntityFrameworkCore;
using Sms.Application.DTOs.Assignment;
using Sms.Application.DTOs.Common;
using Sms.Application.Interfaces;
using Sms.Domain.Entities;
using Sms.Domain.Enums;
using Sms.Infrastructure.Data;

namespace Sms.Infrastructure.Services;

public class AssignmentService : IAssignmentService
{
    private readonly ApplicationDbContext _context;
    private readonly IFileStorageService _fileStorage;
    private readonly INotificationService _notificationService;

    public AssignmentService(
        ApplicationDbContext context, 
        IFileStorageService fileStorage,
        INotificationService notificationService)
    {
        _context = context;
        _fileStorage = fileStorage;
        _notificationService = notificationService;
    }

    public async Task<ApiResponse<AssignmentDto>> GetByIdAsync(Guid id)
    {
        var assignment = await _context.Assignments
            .Include(a => a.Course)
            .Include(a => a.CreatedBy)
            .Include(a => a.Submissions)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assignment == null)
            return ApiResponse<AssignmentDto>.FailResponse("Assignment not found");

        return ApiResponse<AssignmentDto>.SuccessResponse(MapToDto(assignment));
    }

    public async Task<ApiResponse<PagedResponse<AssignmentListDto>>> GetAssignmentsAsync(
        PagedRequest request, Guid? subjectId = null)
    {
        var query = _context.Assignments
            .Include(a => a.Course)
            .Include(a => a.Submissions)
            .Where(a => a.IsActive);

        if (subjectId.HasValue)
            query = query.Where(a => a.CourseId == subjectId.Value);

        if (!string.IsNullOrEmpty(request.SearchTerm))
            query = query.Where(a => a.Title.Contains(request.SearchTerm));

        var totalCount = await query.CountAsync();

        var assignments = await query
            .OrderByDescending(a => a.DueDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(a => new AssignmentListDto(
                a.Id,
                a.Title,
                a.DueDate,
                a.MaxScore,
                a.CourseId,
                a.Course.Name,
                a.Submissions.Count,
                null,
                null  // MyScore - not applicable for instructor view
            ))
            .ToListAsync();

        return ApiResponse<PagedResponse<AssignmentListDto>>.SuccessResponse(
            new PagedResponse<AssignmentListDto>(
                assignments,
                totalCount,
                request.Page,
                request.PageSize,
                (int)Math.Ceiling(totalCount / (double)request.PageSize)
            ));
    }

    public async Task<ApiResponse<AssignmentDto>> CreateAsync(CreateAssignmentRequest request, Guid createdById)
    {
        var assignment = new Assignment
        {
            Title = request.Title,
            Description = request.Description,
            DueDate = request.DueDate,
            MaxScore = request.MaxScore,
            AllowedFileTypes = request.AllowedFileTypes,
            CourseId = request.CourseId,
            CreatedById = createdById
        };

        _context.Assignments.Add(assignment);
        await _context.SaveChangesAsync();

        // Notify students
        await _notificationService.NotifyAssignmentDueAsync(
            request.CourseId,
            assignment.Id,
            assignment.Title,
            assignment.DueDate);

        return await GetByIdAsync(assignment.Id);
    }

    public async Task<ApiResponse<AssignmentDto>> UpdateAsync(Guid id, UpdateAssignmentRequest request)
    {
        var assignment = await _context.Assignments.FindAsync(id);
        if (assignment == null)
            return ApiResponse<AssignmentDto>.FailResponse("Assignment not found");

        if (request.Title != null) assignment.Title = request.Title;
        if (request.Description != null) assignment.Description = request.Description;
        if (request.DueDate.HasValue) assignment.DueDate = request.DueDate.Value;
        if (request.MaxScore.HasValue) assignment.MaxScore = request.MaxScore.Value;
        if (request.AllowedFileTypes != null) assignment.AllowedFileTypes = request.AllowedFileTypes;
        if (request.IsActive.HasValue) assignment.IsActive = request.IsActive.Value;

        assignment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var assignment = await _context.Assignments
            .Include(a => a.Submissions)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assignment == null)
            return ApiResponse.FailResponse("Assignment not found");

        // Delete associated files
        foreach (var submission in assignment.Submissions)
        {
            await _fileStorage.DeleteFileAsync(submission.FilePath);
        }

        _context.Assignments.Remove(assignment);
        await _context.SaveChangesAsync();

        return ApiResponse.SuccessResponse("Assignment deleted successfully");
    }

    public async Task<ApiResponse<SubmissionDto>> SubmitAssignmentAsync(
        Guid assignmentId, Guid studentId, Stream fileStream, string fileName, long fileSize)
    {
        var assignment = await _context.Assignments.FindAsync(assignmentId);
        if (assignment == null)
            return ApiResponse<SubmissionDto>.FailResponse("Assignment not found");

        // Check file type
        var extension = Path.GetExtension(fileName).ToLower();
        var allowedTypes = assignment.AllowedFileTypes?.Split(',').Select(t => t.Trim().ToLower()) 
            ?? new[] { ".pdf", ".doc", ".docx", ".zip" };
        
        if (!allowedTypes.Contains(extension))
            return ApiResponse<SubmissionDto>.FailResponse($"File type not allowed. Allowed: {assignment.AllowedFileTypes}");

        // Check file size
        if (fileSize > assignment.MaxFileSizeBytes)
            return ApiResponse<SubmissionDto>.FailResponse($"File too large. Max size: {assignment.MaxFileSizeBytes / 1024 / 1024}MB");

        // Check for existing submission
        var existingSubmission = await _context.AssignmentSubmissions
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);

        if (existingSubmission != null)
        {
            // Delete old file
            await _fileStorage.DeleteFileAsync(existingSubmission.FilePath);
            _context.AssignmentSubmissions.Remove(existingSubmission);
        }

        // Upload new file
        var filePath = await _fileStorage.UploadFileAsync(fileStream, fileName, $"assignments/{assignmentId}");

        var status = DateTime.UtcNow > assignment.DueDate 
            ? SubmissionStatus.Late 
            : SubmissionStatus.Submitted;

        var submission = new AssignmentSubmission
        {
            AssignmentId = assignmentId,
            StudentId = studentId,
            FileName = fileName,
            FilePath = filePath,
            FileSizeBytes = fileSize,
            Status = status
        };

        _context.AssignmentSubmissions.Add(submission);
        await _context.SaveChangesAsync();

        // Notify instructor about submission
        var course = await _context.Courses
            .Include(c => c.Instructor)
            .FirstOrDefaultAsync(c => c.Id == assignment.CourseId);
        
        var student = await _context.Users.FindAsync(studentId);
        
        if (course?.Instructor != null && student != null)
        {
            // Notify instructor
            await _notificationService.CreateNotificationAsync(
                new Application.DTOs.Notification.CreateNotificationRequest(
                    course.InstructorId,
                    "New Assignment Submission",
                    $"{student.FullName} submitted {assignment.Title} for {course.Name}",
                    Domain.Enums.NotificationType.AssignmentDue,
                    assignment.Id.ToString(),
                    "Assignment",
                    false
                ));
        }

        // Notify student that submission was received
        if (student != null && course != null)
        {
            await _notificationService.CreateNotificationAsync(
                new Application.DTOs.Notification.CreateNotificationRequest(
                    studentId,
                    "Assignment Submitted",
                    $"Your submission for '{assignment.Title}' in {course.Name} has been received.",
                    Domain.Enums.NotificationType.AssignmentDue,
                    assignment.Id.ToString(),
                    "Assignment",
                    false
                ));
        }

        return await GetSubmissionDtoAsync(submission.Id);
    }

    public async Task<ApiResponse<List<SubmissionDto>>> GetSubmissionsAsync(Guid assignmentId)
    {
        var submissions = await _context.AssignmentSubmissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Where(s => s.AssignmentId == assignmentId)
            .ToListAsync();

        return ApiResponse<List<SubmissionDto>>.SuccessResponse(
            submissions.Select(MapSubmissionToDto).ToList());
    }

    public async Task<ApiResponse<SubmissionDto>> GetStudentSubmissionAsync(Guid assignmentId, Guid studentId)
    {
        var submission = await _context.AssignmentSubmissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);

        if (submission == null)
            return ApiResponse<SubmissionDto>.FailResponse("Submission not found");

        return ApiResponse<SubmissionDto>.SuccessResponse(MapSubmissionToDto(submission));
    }

    public async Task<ApiResponse<SubmissionDto>> GradeSubmissionAsync(
        Guid submissionId, GradeSubmissionRequest request, Guid gradedById)
    {
        var submission = await _context.AssignmentSubmissions
            .Include(s => s.Assignment)
            .ThenInclude(a => a.Course)
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.Id == submissionId);

        if (submission == null)
            return ApiResponse<SubmissionDto>.FailResponse("Submission not found");

        submission.Score = request.Score;
        submission.Feedback = request.Feedback;
        submission.GradedById = gradedById;
        submission.GradedAt = DateTime.UtcNow;
        submission.Status = SubmissionStatus.Graded;

        await _context.SaveChangesAsync();

        // Notify student
        await _notificationService.NotifyGradePostedAsync(
            submission.StudentId,
            submission.Assignment.Course?.Name ?? "",
            submission.Assignment.Title,
            request.Score);

        return await GetSubmissionDtoAsync(submissionId);
    }

    public async Task<ApiResponse<Stream>> DownloadSubmissionAsync(Guid submissionId)
    {
        var submission = await _context.AssignmentSubmissions.FindAsync(submissionId);
        if (submission == null)
            return ApiResponse<Stream>.FailResponse("Submission not found");

        try
        {
            var stream = await _fileStorage.DownloadFileAsync(submission.FilePath);
            return ApiResponse<Stream>.SuccessResponse(stream);
        }
        catch (FileNotFoundException)
        {
            return ApiResponse<Stream>.FailResponse("File not found");
        }
    }

    public async Task<ApiResponse<List<AssignmentListDto>>> GetStudentAssignmentsAsync(Guid studentId)
    {
        var enrolledCourses = await _context.Enrollments
            .Where(e => e.StudentId == studentId && e.IsActive)
            .Select(e => e.CourseId)
            .ToListAsync();

        var assignments = await _context.Assignments
            .Include(a => a.Course)
            .Include(a => a.Submissions.Where(s => s.StudentId == studentId))
            .Where(a => enrolledCourses.Contains(a.CourseId) && a.IsActive)
            .OrderBy(a => a.DueDate)
            .Select(a => new AssignmentListDto(
                a.Id,
                a.Title,
                a.DueDate,
                a.MaxScore,
                a.CourseId,
                a.Course.Name,
                a.Submissions.Count,
                a.Submissions.FirstOrDefault(s => s.StudentId == studentId) != null 
                    ? a.Submissions.First(s => s.StudentId == studentId).Status 
                    : null,
                a.Submissions.FirstOrDefault(s => s.StudentId == studentId) != null 
                    ? a.Submissions.First(s => s.StudentId == studentId).Score 
                    : null
            ))
            .ToListAsync();

        return ApiResponse<List<AssignmentListDto>>.SuccessResponse(assignments);
    }

    private async Task<ApiResponse<SubmissionDto>> GetSubmissionDtoAsync(Guid id)
    {
        var submission = await _context.AssignmentSubmissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (submission == null)
            return ApiResponse<SubmissionDto>.FailResponse("Submission not found");

        return ApiResponse<SubmissionDto>.SuccessResponse(MapSubmissionToDto(submission));
    }

    private AssignmentDto MapToDto(Assignment a)
    {
        return new AssignmentDto(
            a.Id,
            a.Title,
            a.Description,
            a.DueDate,
            a.MaxScore,
            a.AllowedFileTypes,
            a.IsActive,
            a.CourseId,
            a.Course?.Name ?? "",
            a.CreatedById,
            a.CreatedBy?.FullName ?? "",
            a.Submissions?.Count ?? 0,
            a.CreatedAt
        );
    }

    private SubmissionDto MapSubmissionToDto(AssignmentSubmission s)
    {
        return new SubmissionDto(
            s.Id,
            s.AssignmentId,
            s.Assignment?.Title ?? "",
            s.StudentId,
            s.Student?.FullName ?? "",
            s.FileName,
            _fileStorage.GetFileUrl(s.FilePath),
            s.FileSizeBytes,
            s.SubmittedAt,
            s.Status,
            s.Score,
            s.Feedback
        );
    }
}
