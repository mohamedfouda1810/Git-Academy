using Sms.Application.DTOs.Assignment;
using Sms.Application.DTOs.Common;

namespace Sms.Application.Interfaces;

public interface IAssignmentService
{
    Task<ApiResponse<AssignmentDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<PagedResponse<AssignmentListDto>>> GetAssignmentsAsync(PagedRequest request, Guid? subjectId = null);
    Task<ApiResponse<AssignmentDto>> CreateAsync(CreateAssignmentRequest request, Guid createdById);
    Task<ApiResponse<AssignmentDto>> UpdateAsync(Guid id, UpdateAssignmentRequest request);
    Task<ApiResponse> DeleteAsync(Guid id);
    
    // Submissions
    Task<ApiResponse<SubmissionDto>> SubmitAssignmentAsync(Guid assignmentId, Guid studentId, Stream fileStream, string fileName, long fileSize);
    Task<ApiResponse<List<SubmissionDto>>> GetSubmissionsAsync(Guid assignmentId);
    Task<ApiResponse<SubmissionDto>> GetStudentSubmissionAsync(Guid assignmentId, Guid studentId);
    Task<ApiResponse<SubmissionDto>> GradeSubmissionAsync(Guid submissionId, GradeSubmissionRequest request, Guid gradedById);
    Task<ApiResponse<Stream>> DownloadSubmissionAsync(Guid submissionId);
    Task<ApiResponse<List<AssignmentListDto>>> GetStudentAssignmentsAsync(Guid studentId);
}
