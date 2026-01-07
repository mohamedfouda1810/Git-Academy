using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Quiz;

namespace Sms.Application.Interfaces;

public interface IQuizService
{
    Task<ApiResponse<QuizDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<PagedResponse<QuizListDto>>> GetQuizzesAsync(PagedRequest request, Guid? subjectId = null, Guid? studentId = null);
    Task<ApiResponse<QuizDto>> CreateAsync(CreateQuizRequest request, Guid createdById);
    Task<ApiResponse<QuizDto>> UpdateAsync(Guid id, UpdateQuizRequest request);
    Task<ApiResponse> DeleteAsync(Guid id);
    
    // Quiz taking
    Task<ApiResponse<QuizDetailDto>> GetQuizForTakingAsync(Guid quizId, Guid studentId);
    Task<ApiResponse<StartQuizAttemptResponse>> StartAttemptAsync(Guid quizId, Guid studentId);
    Task<ApiResponse<QuizAttemptResultDto>> SubmitAttemptAsync(SubmitQuizRequest request, Guid studentId);
    Task<ApiResponse<QuizAttemptResultDto>> GetAttemptResultAsync(Guid attemptId, Guid studentId);
    Task<ApiResponse<List<QuizAttemptResultDto>>> GetStudentAttemptsAsync(Guid studentId, Guid? quizId = null);
    
    // For professors
    Task<ApiResponse<List<QuizAttemptResultDto>>> GetQuizAttemptsAsync(Guid quizId);
}
