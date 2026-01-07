using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Grade;

namespace Sms.Application.Interfaces;

public interface IGradeService
{
    /// <summary>
    /// Get all grades for a student, grouped by course
    /// </summary>
    Task<ApiResponse<StudentGradesDto>> GetStudentGradesAsync(Guid studentId);
    
    /// <summary>
    /// Get grades for a specific course
    /// </summary>
    Task<ApiResponse<CourseGradeSummaryDto>> GetCourseGradesAsync(Guid studentId, Guid courseId);
    
    /// <summary>
    /// Get all enrolled students' grades for instructor's courses
    /// </summary>
    Task<ApiResponse<InstructorGradesDto>> GetInstructorGradesAsync(Guid instructorId);
}
