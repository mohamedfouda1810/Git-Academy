using Sms.Domain.Enums;

namespace Sms.Application.DTOs.Quiz;

public record CreateQuizRequest(
    string Title,
    string? Description,
    int DurationMinutes,
    DateTime StartTime,
    DateTime EndTime,
    bool ShuffleQuestions,
    int? MaxAttempts,
    Guid CourseId,
    List<CreateQuizQuestionRequest> Questions
);

public record CreateQuizQuestionRequest(
    string QuestionText,
    QuestionType QuestionType,
    int Marks,
    int Order,
    List<string>? Options,
    string CorrectAnswer
);

public record UpdateQuizRequest(
    string? Title,
    string? Description,
    int? DurationMinutes,
    DateTime? StartTime,
    DateTime? EndTime,
    bool? ShuffleQuestions,
    int? MaxAttempts,
    bool? IsActive
);

public record QuizDto(
    Guid Id,
    string Title,
    string? Description,
    int DurationMinutes,
    DateTime StartTime,
    DateTime EndTime,
    int TotalMarks,
    bool IsActive,
    bool ShuffleQuestions,
    int? MaxAttempts,
    Guid CourseId,
    string CourseName,
    int QuestionCount,
    int AttemptCount,
    DateTime CreatedAt
);

public record QuizListDto(
    Guid Id,
    string Title,
    DateTime StartTime,
    DateTime EndTime,
    int DurationMinutes,
    int TotalMarks,
    string CourseName,
    bool HasAttempted,
    Guid? MyAttemptId,
    decimal? MyScore
);

public record QuizDetailDto(
    Guid Id,
    string Title,
    string? Description,
    int DurationMinutes,
    DateTime StartTime,
    DateTime EndTime,
    int TotalMarks,
    List<QuizQuestionDto> Questions
);

public record QuizQuestionDto(
    Guid Id,
    string QuestionText,
    QuestionType QuestionType,
    int Marks,
    int Order,
    List<string>? Options
);

public record StartQuizAttemptResponse(
    Guid AttemptId,
    DateTime StartedAt,
    DateTime MustSubmitBy,
    List<QuizQuestionDto> Questions
);

public record SubmitQuizRequest(
    Guid AttemptId,
    List<QuizAnswerRequest> Answers
);

public record QuizAnswerRequest(
    Guid QuestionId,
    string Answer
);

public record QuizAttemptResultDto(
    Guid AttemptId,
    Guid QuizId,
    string QuizTitle,
    Guid StudentId,
    string StudentName,
    DateTime StartedAt,
    DateTime? SubmittedAt,
    decimal Score,
    decimal Percentage,
    int TotalMarks,
    List<QuizAnswerResultDto>? Answers
);

public record QuizAnswerResultDto(
    Guid QuestionId,
    string QuestionText,
    string? YourAnswer,
    string CorrectAnswer,
    bool IsCorrect,
    decimal MarksAwarded
);
