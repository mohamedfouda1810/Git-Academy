using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Course;
using Sms.Application.DTOs.Session;

namespace Sms.Application.Interfaces;

public interface ICourseService
{
    // Course CRUD
    Task<ApiResponse<CourseDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<PagedResponse<CourseListDto>>> GetCoursesAsync(CourseFilterRequest filter);
    Task<ApiResponse<CourseDto>> CreateAsync(CreateCourseRequest request, Guid createdById);
    Task<ApiResponse<CourseDto>> UpdateAsync(Guid id, UpdateCourseRequest request);
    Task<ApiResponse> DeleteAsync(Guid id);
    
    // Course access
    Task<ApiResponse<CoursePreviewDto>> GetCoursePreviewAsync(Guid id);
    Task<ApiResponse<CourseDetailsDto>> GetCourseDetailsAsync(Guid id, Guid userId);
    Task<bool> HasCourseAccessAsync(Guid courseId, Guid userId);
    
    // Session management
    Task<ApiResponse<SessionDto>> CreateSessionAsync(Guid courseId, CreateSessionRequest request, Guid createdById);
    Task<ApiResponse<SessionDto>> UpdateSessionAsync(Guid courseId, Guid sessionId, UpdateSessionRequest request);
    Task<ApiResponse> DeleteSessionAsync(Guid courseId, Guid sessionId);
    Task<ApiResponse<SessionDto>> GetSessionAsync(Guid courseId, Guid sessionId, Guid userId);
    Task<ApiResponse<List<SessionDto>>> GetCourseSessionsAsync(Guid courseId, Guid userId);
    Task<ApiResponse<string>> UploadSessionContentAsync(Guid courseId, Guid sessionId, Stream fileStream, string fileName, string contentType);
    
    // Session quiz
    Task<ApiResponse<SessionQuizDto>> CreateSessionQuizAsync(Guid courseId, Guid sessionId, CreateSessionQuizRequest request, Guid createdById);
    
    // Enrollment
    Task<ApiResponse<EnrollmentDto>> EnrollStudentAsync(Guid studentId, EnrollmentRequest request);
    Task<ApiResponse> UnenrollStudentAsync(Guid studentId, Guid courseId);
    Task<ApiResponse<List<EnrollmentDto>>> GetStudentEnrollmentsAsync(Guid studentId);
    Task<ApiResponse<List<CourseListDto>>> GetInstructorCoursesAsync(Guid instructorId);
    Task<ApiResponse<List<EnrollmentDto>>> GetCourseEnrollmentsAsync(Guid courseId);
    Task<ApiResponse> SetFinalGradeAsync(Guid enrollmentId, decimal grade);
}
