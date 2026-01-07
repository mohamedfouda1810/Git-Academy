namespace Sms.Application.DTOs.Session;

public record CreateSessionRequest(
    string Title,
    string Description,
    int Order
);

public record UpdateSessionRequest(
    string? Title,
    string? Description,
    int? Order,
    bool? IsActive
);

public record SessionDto(
    Guid Id,
    Guid CourseId,
    string Title,
    string Description,
    int Order,
    string? PdfUrl,
    string? VideoUrl,
    bool IsActive,
    SessionQuizDto? Quiz,
    DateTime CreatedAt
);

public record SessionQuizDto(
    Guid Id,
    string Title,
    int DurationMinutes,
    int TotalMarks,
    List<SessionQuizQuestionDto> Questions
);

public record SessionQuizQuestionDto(
    Guid Id,
    string QuestionText,
    string QuestionType,
    int Marks,
    int Order,
    List<string>? Options
);

// Upload content request
public record UploadSessionContentRequest(
    string ContentType // "pdf" or "video"
);

// Create quiz for session
public record CreateSessionQuizRequest(
    string Title,
    int DurationMinutes,
    List<CreateSessionQuizQuestionRequest> Questions // Must be 3 questions
);

public record CreateSessionQuizQuestionRequest(
    string QuestionText,
    string QuestionType, // MultipleChoice, TrueFalse, ShortAnswer
    int Marks,
    int Order,
    List<string>? Options,
    string CorrectAnswer
);
