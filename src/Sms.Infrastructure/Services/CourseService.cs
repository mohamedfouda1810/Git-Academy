using Microsoft.EntityFrameworkCore;
using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Course;
using Sms.Application.DTOs.Session;
using Sms.Application.Interfaces;
using Sms.Domain.Entities;
using Sms.Domain.Enums;
using Sms.Infrastructure.Data;
using System.Text.Json;

namespace Sms.Infrastructure.Services;

public class CourseService : ICourseService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IFileStorageService _fileStorageService;

    public CourseService(
        ApplicationDbContext context, 
        INotificationService notificationService,
        IFileStorageService fileStorageService)
    {
        _context = context;
        _notificationService = notificationService;
        _fileStorageService = fileStorageService;
    }

    #region Course CRUD

    public async Task<ApiResponse<CourseDto>> GetByIdAsync(Guid id)
    {
        var course = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Enrollments)
            .Include(c => c.Sessions)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
            return ApiResponse<CourseDto>.FailResponse("Course not found");

        return ApiResponse<CourseDto>.SuccessResponse(MapToDto(course));
    }

    public async Task<ApiResponse<PagedResponse<CourseListDto>>> GetCoursesAsync(CourseFilterRequest filter)
    {
        var query = _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Enrollments)
            .Include(c => c.Sessions)
            .AsQueryable();

        // Apply filters
        if (!string.IsNullOrEmpty(filter.SearchTerm))
        {
            query = query.Where(c => 
                c.Name.Contains(filter.SearchTerm) || 
                c.Code.Contains(filter.SearchTerm) ||
                (c.Description != null && c.Description.Contains(filter.SearchTerm)));
        }

        if (!string.IsNullOrEmpty(filter.Semester))
            query = query.Where(c => c.Semester == filter.Semester);

        if (filter.Year.HasValue)
            query = query.Where(c => c.Year == filter.Year);

        if (filter.MinPrice.HasValue)
            query = query.Where(c => c.Price >= filter.MinPrice);

        if (filter.MaxPrice.HasValue)
            query = query.Where(c => c.Price <= filter.MaxPrice);

        if (filter.InstructorId.HasValue)
            query = query.Where(c => c.InstructorId == filter.InstructorId);

        if (filter.IsActive.HasValue)
            query = query.Where(c => c.IsActive == filter.IsActive);
        else
            query = query.Where(c => c.IsActive);

        var totalCount = await query.CountAsync();
        
        var courses = await query
            .OrderBy(c => c.Name)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(c => new CourseListDto(
                c.Id,
                c.Code,
                c.Name,
                c.Credits,
                c.Semester,
                c.Year,
                c.Price,
                c.Instructor != null ? c.Instructor.FirstName + " " + c.Instructor.LastName : "Unknown",
                c.Enrollments.Count(e => e.IsActive),
                c.Sessions.Count(s => s.IsActive)
            ))
            .ToListAsync();

        return ApiResponse<PagedResponse<CourseListDto>>.SuccessResponse(
            new PagedResponse<CourseListDto>(
                courses,
                totalCount,
                filter.Page,
                filter.PageSize,
                (int)Math.Ceiling(totalCount / (double)filter.PageSize)
            ));
    }

    public async Task<ApiResponse<CourseDto>> CreateAsync(CreateCourseRequest request, Guid createdById)
    {
        if (await _context.Courses.AnyAsync(c => c.Code == request.Code))
            return ApiResponse<CourseDto>.FailResponse("Course code already exists");

        var course = new Course
        {
            Code = request.Code,
            Name = request.Name,
            Description = request.Description,
            PreviewDescription = request.PreviewDescription,
            Credits = request.Credits,
            Semester = request.Semester,
            Year = request.Year,
            InstructorId = request.InstructorId,
            Price = request.Price
        };

        _context.Courses.Add(course);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(course.Id);
    }

    public async Task<ApiResponse<CourseDto>> UpdateAsync(Guid id, UpdateCourseRequest request)
    {
        var course = await _context.Courses.FindAsync(id);
        if (course == null)
            return ApiResponse<CourseDto>.FailResponse("Course not found");

        if (request.Name != null) course.Name = request.Name;
        if (request.Description != null) course.Description = request.Description;
        if (request.PreviewDescription != null) course.PreviewDescription = request.PreviewDescription;
        if (request.ThumbnailUrl != null) course.ThumbnailUrl = request.ThumbnailUrl;
        if (request.Credits.HasValue) course.Credits = request.Credits.Value;
        if (request.Semester != null) course.Semester = request.Semester;
        if (request.Year.HasValue) course.Year = request.Year.Value;
        if (request.IsActive.HasValue) course.IsActive = request.IsActive.Value;
        if (request.Price.HasValue) course.Price = request.Price.Value;

        course.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var course = await _context.Courses.FindAsync(id);
        if (course == null)
            return ApiResponse.FailResponse("Course not found");

        _context.Courses.Remove(course);
        await _context.SaveChangesAsync();

        return ApiResponse.SuccessResponse("Course deleted successfully");
    }

    #endregion

    #region Course Access

    public async Task<ApiResponse<CoursePreviewDto>> GetCoursePreviewAsync(Guid id)
    {
        var course = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Enrollments)
            .Include(c => c.Sessions)
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

        if (course == null)
            return ApiResponse<CoursePreviewDto>.FailResponse("Course not found");

        var preview = new CoursePreviewDto(
            course.Id,
            course.Code,
            course.Name,
            course.PreviewDescription ?? (course.Description != null ? course.Description.Substring(0, Math.Min(200, course.Description.Length)) : null),
            course.ThumbnailUrl,
            course.Price,
            course.Instructor?.FullName ?? "Unknown",
            course.Sessions.Count(s => s.IsActive),
            course.Enrollments.Count(e => e.IsActive)
        );

        return ApiResponse<CoursePreviewDto>.SuccessResponse(preview);
    }

    public async Task<ApiResponse<CourseDetailsDto>> GetCourseDetailsAsync(Guid id, Guid userId)
    {
        var course = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sessions.Where(s => s.IsActive).OrderBy(s => s.Order))
                .ThenInclude(s => s.Quiz)
                    .ThenInclude(q => q!.Questions.OrderBy(qq => qq.Order))
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
            return ApiResponse<CourseDetailsDto>.FailResponse("Course not found");

        // Check if user is enrolled and has paid
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == id && e.StudentId == userId && e.IsActive);
        
        var hasPaid = await _context.Payments
            .AnyAsync(p => p.CourseId == id && p.UserId == userId && p.Status == "succeeded");

        // Check if user has access (enrolled & paid, or is instructor/admin)
        var hasAccess = await HasCourseAccessAsync(id, userId);

        List<SessionSummaryDto>? sessions = null;
        if (hasAccess)
        {
            sessions = course.Sessions
                .Select(s => new SessionSummaryDto(
                    s.Id,
                    s.Title,
                    s.Description,
                    s.Order,
                    !string.IsNullOrEmpty(s.PdfUrl),
                    !string.IsNullOrEmpty(s.VideoUrl),
                    s.Quiz != null
                ))
                .ToList();
        }

        var details = new CourseDetailsDto(
            course.Id,
            course.Code,
            course.Name,
            hasAccess ? course.Description : course.PreviewDescription,
            course.Price,
            course.InstructorId,
            course.Instructor?.FullName ?? "Unknown",
            course.Credits,
            course.Semester,
            course.Year,
            course.Enrollments?.Count(e => e.IsActive) ?? 0,
            hasAccess,
            enrollment != null,
            hasPaid,
            sessions
        );

        return ApiResponse<CourseDetailsDto>.SuccessResponse(details);
    }

    public async Task<bool> HasCourseAccessAsync(Guid courseId, Guid userId)
    {
        // Check if user is enrolled
        var isEnrolled = await _context.Enrollments
            .AnyAsync(e => e.CourseId == courseId && e.StudentId == userId && e.IsActive);

        if (isEnrolled) return true;

        // Check if user is the instructor
        var isInstructor = await _context.Courses
            .AnyAsync(c => c.Id == courseId && c.InstructorId == userId);

        if (isInstructor) return true;

        // Check if user is admin
        var user = await _context.Users.FindAsync(userId);
        if (user?.Role == UserRole.Admin) return true;

        return false;
    }

    #endregion

    #region Session Management

    public async Task<ApiResponse<SessionDto>> CreateSessionAsync(Guid courseId, CreateSessionRequest request, Guid createdById)
    {
        var course = await _context.Courses.FindAsync(courseId);
        if (course == null)
            return ApiResponse<SessionDto>.FailResponse("Course not found");

        var session = new Session
        {
            CourseId = courseId,
            Title = request.Title,
            Description = request.Description,
            Order = request.Order,
            IsActive = true
        };

        _context.Set<Session>().Add(session);
        await _context.SaveChangesAsync();

        // Notify enrolled students
        await _notificationService.NotifyNewSessionAsync(courseId, session.Id, session.Title);

        return await GetSessionAsync(courseId, session.Id, createdById);
    }

    public async Task<ApiResponse<SessionDto>> UpdateSessionAsync(Guid courseId, Guid sessionId, UpdateSessionRequest request)
    {
        var session = await _context.Set<Session>()
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CourseId == courseId);

        if (session == null)
            return ApiResponse<SessionDto>.FailResponse("Session not found");

        if (request.Title != null) session.Title = request.Title;
        if (request.Description != null) session.Description = request.Description;
        if (request.Order.HasValue) session.Order = request.Order.Value;
        if (request.IsActive.HasValue) session.IsActive = request.IsActive.Value;

        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetSessionAsync(courseId, sessionId, Guid.Empty);
    }

    public async Task<ApiResponse> DeleteSessionAsync(Guid courseId, Guid sessionId)
    {
        var session = await _context.Set<Session>()
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CourseId == courseId);

        if (session == null)
            return ApiResponse.FailResponse("Session not found");

        _context.Set<Session>().Remove(session);
        await _context.SaveChangesAsync();

        return ApiResponse.SuccessResponse("Session deleted successfully");
    }

    public async Task<ApiResponse<SessionDto>> GetSessionAsync(Guid courseId, Guid sessionId, Guid userId)
    {
        var session = await _context.Set<Session>()
            .Include(s => s.Quiz)
                .ThenInclude(q => q!.Questions.OrderBy(qq => qq.Order))
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CourseId == courseId);

        if (session == null)
            return ApiResponse<SessionDto>.FailResponse("Session not found");

        return ApiResponse<SessionDto>.SuccessResponse(MapToSessionDto(session));
    }

    public async Task<ApiResponse<List<SessionDto>>> GetCourseSessionsAsync(Guid courseId, Guid userId)
    {
        var hasAccess = await HasCourseAccessAsync(courseId, userId);
        if (!hasAccess)
            return ApiResponse<List<SessionDto>>.FailResponse("Access denied. Please purchase the course first.");

        var sessions = await _context.Set<Session>()
            .Include(s => s.Quiz)
                .ThenInclude(q => q!.Questions.OrderBy(qq => qq.Order))
            .Where(s => s.CourseId == courseId && s.IsActive)
            .OrderBy(s => s.Order)
            .ToListAsync();

        return ApiResponse<List<SessionDto>>.SuccessResponse(
            sessions.Select(MapToSessionDto).ToList());
    }

    public async Task<ApiResponse<string>> UploadSessionContentAsync(
        Guid courseId, Guid sessionId, Stream fileStream, string fileName, string contentType)
    {
        var session = await _context.Set<Session>()
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CourseId == courseId);

        if (session == null)
            return ApiResponse<string>.FailResponse("Session not found");

        var filePath = await _fileStorageService.UploadFileAsync(fileStream, fileName, $"sessions/{sessionId}");

        if (contentType.ToLower() == "pdf")
            session.PdfUrl = filePath;
        else if (contentType.ToLower() == "video")
            session.VideoUrl = filePath;

        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return ApiResponse<string>.SuccessResponse(filePath);
    }

    public async Task<ApiResponse<SessionQuizDto>> CreateSessionQuizAsync(
        Guid courseId, Guid sessionId, CreateSessionQuizRequest request, Guid createdById)
    {
        var session = await _context.Set<Session>()
            .Include(s => s.Quiz)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CourseId == courseId);

        if (session == null)
            return ApiResponse<SessionQuizDto>.FailResponse("Session not found");

        if (session.Quiz != null)
            return ApiResponse<SessionQuizDto>.FailResponse("Session already has a quiz");

        if (request.Questions.Count < 1)
            return ApiResponse<SessionQuizDto>.FailResponse("Quiz must have at least 1 question");

        var quiz = new Quiz
        {
            Title = request.Title,
            SessionId = sessionId,
            CourseId = courseId,
            DurationMinutes = request.DurationMinutes,
            TotalMarks = request.Questions.Sum(q => q.Marks),
            CreatedById = createdById,
            StartTime = DateTime.UtcNow,
            EndTime = DateTime.UtcNow.AddYears(1),
            IsActive = true,
            Questions = request.Questions.Select(q => new QuizQuestion
            {
                QuestionText = q.QuestionText,
                QuestionType = Enum.Parse<QuestionType>(q.QuestionType),
                Marks = q.Marks,
                Order = q.Order,
                Options = q.Options != null ? JsonSerializer.Serialize(q.Options) : null,
                CorrectAnswer = q.CorrectAnswer
            }).ToList()
        };

        _context.Quizzes.Add(quiz);
        await _context.SaveChangesAsync();

        return ApiResponse<SessionQuizDto>.SuccessResponse(MapToSessionQuizDto(quiz));
    }

    #endregion

    #region Enrollment

    public async Task<ApiResponse<EnrollmentDto>> EnrollStudentAsync(Guid studentId, EnrollmentRequest request)
    {
        var existingEnrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.StudentId == studentId && e.CourseId == request.CourseId);

        if (existingEnrollment != null)
        {
            if (existingEnrollment.IsActive)
                return ApiResponse<EnrollmentDto>.FailResponse("Already enrolled in this course");
            
            existingEnrollment.IsActive = true;
            existingEnrollment.EnrolledAt = DateTime.UtcNow;
        }
        else
        {
            var enrollment = new Enrollment
            {
                StudentId = studentId,
                CourseId = request.CourseId,
                EnrolledAt = DateTime.UtcNow,
                IsActive = true
            };
            _context.Enrollments.Add(enrollment);
        }

        await _context.SaveChangesAsync();

        var result = await _context.Enrollments
            .Include(e => e.Student)
            .Include(e => e.Course)
            .FirstOrDefaultAsync(e => e.StudentId == studentId && e.CourseId == request.CourseId);

        return ApiResponse<EnrollmentDto>.SuccessResponse(MapToEnrollmentDto(result!));
    }

    public async Task<ApiResponse> UnenrollStudentAsync(Guid studentId, Guid courseId)
    {
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.StudentId == studentId && e.CourseId == courseId);

        if (enrollment == null)
            return ApiResponse.FailResponse("Enrollment not found");

        enrollment.IsActive = false;
        await _context.SaveChangesAsync();

        return ApiResponse.SuccessResponse("Unenrolled successfully");
    }

    public async Task<ApiResponse<List<EnrollmentDto>>> GetStudentEnrollmentsAsync(Guid studentId)
    {
        var enrollments = await _context.Enrollments
            .Include(e => e.Student)
            .Include(e => e.Course)
            .Where(e => e.StudentId == studentId && e.IsActive)
            .ToListAsync();

        return ApiResponse<List<EnrollmentDto>>.SuccessResponse(
            enrollments.Select(MapToEnrollmentDto).ToList());
    }

    public async Task<ApiResponse<List<CourseListDto>>> GetInstructorCoursesAsync(Guid instructorId)
    {
        var courses = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Enrollments)
            .Include(c => c.Sessions)
            .Where(c => c.InstructorId == instructorId)
            .Select(c => new CourseListDto(
                c.Id,
                c.Code,
                c.Name,
                c.Credits,
                c.Semester,
                c.Year,
                c.Price,
                c.Instructor != null ? c.Instructor.FirstName + " " + c.Instructor.LastName : "Unknown",
                c.Enrollments.Count(e => e.IsActive),
                c.Sessions.Count(s => s.IsActive)
            ))
            .ToListAsync();

        return ApiResponse<List<CourseListDto>>.SuccessResponse(courses);
    }

    public async Task<ApiResponse<List<EnrollmentDto>>> GetCourseEnrollmentsAsync(Guid courseId)
    {
        var enrollments = await _context.Enrollments
            .Include(e => e.Student)
            .Include(e => e.Course)
            .Where(e => e.CourseId == courseId && e.IsActive)
            .ToListAsync();

        return ApiResponse<List<EnrollmentDto>>.SuccessResponse(
            enrollments.Select(MapToEnrollmentDto).ToList());
    }

    public async Task<ApiResponse> SetFinalGradeAsync(Guid enrollmentId, decimal grade)
    {
        var enrollment = await _context.Enrollments
            .Include(e => e.Student)
            .Include(e => e.Course)
            .FirstOrDefaultAsync(e => e.Id == enrollmentId);

        if (enrollment == null)
            return ApiResponse.FailResponse("Enrollment not found");

        enrollment.FinalGrade = grade;
        await _context.SaveChangesAsync();

        await _notificationService.NotifyGradePostedAsync(
            enrollment.StudentId,
            enrollment.Course.Name,
            "Final Grade",
            grade);

        return ApiResponse.SuccessResponse("Grade updated successfully");
    }

    #endregion

    #region Mappers

    private CourseDto MapToDto(Course course)
    {
        return new CourseDto(
            course.Id,
            course.Code,
            course.Name,
            course.Description,
            course.PreviewDescription,
            course.ThumbnailUrl,
            course.Credits,
            course.Semester,
            course.Year,
            course.Price,
            course.IsActive,
            course.InstructorId,
            course.Instructor?.FullName ?? "",
            course.Enrollments?.Count(e => e.IsActive) ?? 0,
            course.Sessions?.Count(s => s.IsActive) ?? 0,
            course.CreatedAt
        );
    }

    private EnrollmentDto MapToEnrollmentDto(Enrollment enrollment)
    {
        return new EnrollmentDto(
            enrollment.Id,
            enrollment.StudentId,
            enrollment.Student?.FullName ?? "",
            enrollment.CourseId,
            enrollment.Course?.Name ?? "",
            enrollment.EnrolledAt,
            enrollment.FinalGrade,
            enrollment.IsActive
        );
    }

    private SessionDto MapToSessionDto(Session session)
    {
        return new SessionDto(
            session.Id,
            session.CourseId,
            session.Title,
            session.Description,
            session.Order,
            session.PdfUrl,
            session.VideoUrl,
            session.IsActive,
            session.Quiz != null ? MapToSessionQuizDto(session.Quiz) : null,
            session.CreatedAt
        );
    }

    private SessionQuizDto MapToSessionQuizDto(Quiz quiz)
    {
        return new SessionQuizDto(
            quiz.Id,
            quiz.Title,
            quiz.DurationMinutes,
            quiz.TotalMarks,
            quiz.Questions.Select(q => new SessionQuizQuestionDto(
                q.Id,
                q.QuestionText,
                q.QuestionType.ToString(),
                q.Marks,
                q.Order,
                !string.IsNullOrEmpty(q.Options) ? JsonSerializer.Deserialize<List<string>>(q.Options) : null
            )).ToList()
        );
    }

    #endregion
}
