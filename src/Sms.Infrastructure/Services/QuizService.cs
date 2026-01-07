using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Quiz;
using Sms.Application.Interfaces;
using Sms.Domain.Entities;
using Sms.Domain.Enums;
using Sms.Infrastructure.Data;

namespace Sms.Infrastructure.Services;

public class QuizService : IQuizService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public QuizService(ApplicationDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<ApiResponse<QuizDto>> GetByIdAsync(Guid id)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.Course)
            .Include(q => q.Questions)
            .Include(q => q.Attempts)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quiz == null)
            return ApiResponse<QuizDto>.FailResponse("Quiz not found");

        return ApiResponse<QuizDto>.SuccessResponse(MapToDto(quiz));
    }

    public async Task<ApiResponse<PagedResponse<QuizListDto>>> GetQuizzesAsync(
        PagedRequest request, Guid? subjectId = null, Guid? studentId = null)
    {
        var query = _context.Quizzes
            .Include(q => q.Course)
            .Include(q => q.Attempts)
            .Where(q => q.IsActive);

        if (subjectId.HasValue)
            query = query.Where(q => q.CourseId == subjectId.Value);

        if (studentId.HasValue)
        {
            var enrolledCourses = await _context.Enrollments
                .Where(e => e.StudentId == studentId.Value && e.IsActive)
                .Select(e => e.CourseId)
                .ToListAsync();
            
            var ownedCourses = await _context.Courses
                .Where(c => c.InstructorId == studentId.Value)
                .Select(c => c.Id)
                .ToListAsync();
            
            var allowedCourses = enrolledCourses.Concat(ownedCourses).Distinct().ToList();

            query = query.Where(q => allowedCourses.Contains(q.CourseId ?? Guid.Empty));
        }

        if (!string.IsNullOrEmpty(request.SearchTerm))
            query = query.Where(q => q.Title.Contains(request.SearchTerm));

        var totalCount = await query.CountAsync();

        var quizzes = await query
            .OrderByDescending(q => q.StartTime)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        var dtos = quizzes.Select(q => new QuizListDto(
            q.Id,
            q.Title,
            q.StartTime,
            q.EndTime,
            q.DurationMinutes,
            q.TotalMarks,
            q.Course?.Name ?? "",
            studentId.HasValue && q.Attempts.Any(a => a.StudentId == studentId.Value && a.IsCompleted),
            studentId.HasValue 
                ? q.Attempts.FirstOrDefault(a => a.StudentId == studentId.Value && a.IsCompleted)?.Id 
                : null,
            studentId.HasValue 
                ? q.Attempts.FirstOrDefault(a => a.StudentId == studentId.Value && a.IsCompleted)?.Score 
                : null
        )).ToList();

        return ApiResponse<PagedResponse<QuizListDto>>.SuccessResponse(
            new PagedResponse<QuizListDto>(
                dtos,
                totalCount,
                request.Page,
                request.PageSize,
                (int)Math.Ceiling(totalCount / (double)request.PageSize)
            ));
    }

    public async Task<ApiResponse<QuizDto>> CreateAsync(CreateQuizRequest request, Guid createdById)
    {
        var quiz = new Quiz
        {
            Title = request.Title,
            Description = request.Description,
            DurationMinutes = request.DurationMinutes,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            ShuffleQuestions = request.ShuffleQuestions,
            MaxAttempts = request.MaxAttempts,
            CourseId = request.CourseId,
            CreatedById = createdById,
            TotalMarks = request.Questions.Sum(q => q.Marks)
        };

        _context.Quizzes.Add(quiz);

        // Add questions
        foreach (var q in request.Questions)
        {
            var question = new QuizQuestion
            {
                QuizId = quiz.Id,
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                Marks = q.Marks,
                Order = q.Order,
                Options = q.Options != null ? JsonSerializer.Serialize(q.Options) : null,
                CorrectAnswer = q.CorrectAnswer
            };
            _context.QuizQuestions.Add(question);
        }

        await _context.SaveChangesAsync();

        // Notify students
        await _notificationService.NotifyQuizAvailableAsync(request.CourseId, quiz.Id, quiz.Title);

        return await GetByIdAsync(quiz.Id);
    }

    public async Task<ApiResponse<QuizDto>> UpdateAsync(Guid id, UpdateQuizRequest request)
    {
        var quiz = await _context.Quizzes.FindAsync(id);
        if (quiz == null)
            return ApiResponse<QuizDto>.FailResponse("Quiz not found");

        if (request.Title != null) quiz.Title = request.Title;
        if (request.Description != null) quiz.Description = request.Description;
        if (request.DurationMinutes.HasValue) quiz.DurationMinutes = request.DurationMinutes.Value;
        if (request.StartTime.HasValue) quiz.StartTime = request.StartTime.Value;
        if (request.EndTime.HasValue) quiz.EndTime = request.EndTime.Value;
        if (request.ShuffleQuestions.HasValue) quiz.ShuffleQuestions = request.ShuffleQuestions.Value;
        if (request.MaxAttempts.HasValue) quiz.MaxAttempts = request.MaxAttempts;
        if (request.IsActive.HasValue) quiz.IsActive = request.IsActive.Value;

        quiz.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var quiz = await _context.Quizzes.FindAsync(id);
        if (quiz == null)
            return ApiResponse.FailResponse("Quiz not found");

        _context.Quizzes.Remove(quiz);
        await _context.SaveChangesAsync();

        return ApiResponse.SuccessResponse("Quiz deleted successfully");
    }

    public async Task<ApiResponse<QuizDetailDto>> GetQuizForTakingAsync(Guid quizId, Guid studentId)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.Questions.OrderBy(qu => qu.Order))
            .FirstOrDefaultAsync(q => q.Id == quizId && q.IsActive);

        if (quiz == null)
            return ApiResponse<QuizDetailDto>.FailResponse("Quiz not found");

        var now = DateTime.UtcNow;
        if (now < quiz.StartTime)
            return ApiResponse<QuizDetailDto>.FailResponse("Quiz has not started yet");
        if (now > quiz.EndTime)
            return ApiResponse<QuizDetailDto>.FailResponse("Quiz has ended");

        // Check attempts
        var attemptCount = await _context.QuizAttempts
            .CountAsync(a => a.QuizId == quizId && a.StudentId == studentId && a.IsCompleted);

        if (quiz.MaxAttempts.HasValue && attemptCount >= quiz.MaxAttempts.Value)
            return ApiResponse<QuizDetailDto>.FailResponse("Maximum attempts reached");

        var questions = quiz.Questions.Select(q => new QuizQuestionDto(
            q.Id,
            q.QuestionText,
            q.QuestionType,
            q.Marks,
            q.Order,
            q.Options != null ? JsonSerializer.Deserialize<List<string>>(q.Options) : null
        )).ToList();

        // Shuffle if needed
        if (quiz.ShuffleQuestions)
            questions = questions.OrderBy(_ => Guid.NewGuid()).ToList();

        return ApiResponse<QuizDetailDto>.SuccessResponse(new QuizDetailDto(
            quiz.Id,
            quiz.Title,
            quiz.Description,
            quiz.DurationMinutes,
            quiz.StartTime,
            quiz.EndTime,
            quiz.TotalMarks,
            questions
        ));
    }

    public async Task<ApiResponse<StartQuizAttemptResponse>> StartAttemptAsync(Guid quizId, Guid studentId)
    {
        var quizResult = await GetQuizForTakingAsync(quizId, studentId);
        if (!quizResult.Success || quizResult.Data == null)
            return ApiResponse<StartQuizAttemptResponse>.FailResponse(quizResult.Message ?? "Cannot start quiz");

        // Check for existing incomplete attempt
        var existingAttempt = await _context.QuizAttempts
            .FirstOrDefaultAsync(a => a.QuizId == quizId && a.StudentId == studentId && !a.IsCompleted);

        if (existingAttempt != null)
        {
            // Resume existing attempt
            var remainingTime = existingAttempt.StartedAt.AddMinutes(quizResult.Data.DurationMinutes) - DateTime.UtcNow;
            if (remainingTime.TotalSeconds <= 0)
            {
                // Auto-submit expired attempt
                existingAttempt.IsCompleted = true;
                existingAttempt.SubmittedAt = DateTime.UtcNow;
                existingAttempt.Score = 0;
                existingAttempt.Percentage = 0;
                await _context.SaveChangesAsync();
                return ApiResponse<StartQuizAttemptResponse>.FailResponse("Previous attempt expired");
            }

            return ApiResponse<StartQuizAttemptResponse>.SuccessResponse(new StartQuizAttemptResponse(
                existingAttempt.Id,
                existingAttempt.StartedAt,
                existingAttempt.StartedAt.AddMinutes(quizResult.Data.DurationMinutes),
                quizResult.Data.Questions
            ));
        }

        // Create new attempt
        var attempt = new QuizAttempt
        {
            QuizId = quizId,
            StudentId = studentId
        };

        _context.QuizAttempts.Add(attempt);
        await _context.SaveChangesAsync();

        return ApiResponse<StartQuizAttemptResponse>.SuccessResponse(new StartQuizAttemptResponse(
            attempt.Id,
            attempt.StartedAt,
            attempt.StartedAt.AddMinutes(quizResult.Data.DurationMinutes),
            quizResult.Data.Questions
        ));
    }

    public async Task<ApiResponse<QuizAttemptResultDto>> SubmitAttemptAsync(SubmitQuizRequest request, Guid studentId)
    {
        var attempt = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .ThenInclude(q => q.Questions)
            .Include(a => a.Student)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId && a.StudentId == studentId);

        if (attempt == null)
            return ApiResponse<QuizAttemptResultDto>.FailResponse("Attempt not found");

        if (attempt.IsCompleted)
            return ApiResponse<QuizAttemptResultDto>.FailResponse("Attempt already submitted");

        decimal totalScore = 0;
        var answerResults = new List<QuizAnswerResultDto>();

        foreach (var answer in request.Answers)
        {
            var question = attempt.Quiz.Questions.FirstOrDefault(q => q.Id == answer.QuestionId);
            if (question == null) continue;

            var isCorrect = question.CorrectAnswer.Equals(answer.Answer, StringComparison.OrdinalIgnoreCase);
            var marksAwarded = isCorrect ? question.Marks : 0;
            totalScore += marksAwarded;

            var quizAnswer = new QuizAnswer
            {
                AttemptId = attempt.Id,
                QuestionId = question.Id,
                AnswerText = answer.Answer,
                IsCorrect = isCorrect,
                MarksAwarded = marksAwarded
            };

            _context.QuizAnswers.Add(quizAnswer);

            answerResults.Add(new QuizAnswerResultDto(
                question.Id,
                question.QuestionText,
                answer.Answer,
                question.CorrectAnswer,
                isCorrect,
                marksAwarded
            ));
        }

        attempt.IsCompleted = true;
        attempt.SubmittedAt = DateTime.UtcNow;
        attempt.Score = totalScore;
        attempt.Percentage = attempt.Quiz.TotalMarks > 0 
            ? (totalScore / attempt.Quiz.TotalMarks) * 100 
            : 0;

        await _context.SaveChangesAsync();

        // Notify Instructor
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == attempt.Quiz.CourseId);

        if (course != null)
        {
            // We need to fetch instructor ID if not loaded, but course has InstructorId property
            await _notificationService.CreateNotificationAsync(new Application.DTOs.Notification.CreateNotificationRequest(
                course.InstructorId,
                "Quiz Attempt Submitted",
                $"{attempt.Student.FirstName} {attempt.Student.LastName} submitted attempt for {attempt.Quiz.Title}",
                NotificationType.AssignmentDue, // Reusing AssignmentDue type
                attempt.Id.ToString(),
                "QuizAttempt",
                false
            ));
        }

        // Notify grade posted
        await _notificationService.NotifyGradePostedAsync(
            studentId,
            attempt.Quiz.Course?.Name ?? "Unknown",
            attempt.Quiz.Title,
            totalScore);

        return ApiResponse<QuizAttemptResultDto>.SuccessResponse(new QuizAttemptResultDto(
            attempt.Id,
            attempt.QuizId,
            attempt.Quiz.Title,
            attempt.StudentId,
            $"{attempt.Student.FirstName} {attempt.Student.LastName}",
            attempt.StartedAt,
            attempt.SubmittedAt,
            totalScore,
            attempt.Percentage ?? 0,
            attempt.Quiz.TotalMarks,
            answerResults
        ));
    }

    public async Task<ApiResponse<QuizAttemptResultDto>> GetAttemptResultAsync(Guid attemptId, Guid userId)
    {
        var attempt = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .Include(a => a.Answers)
            .ThenInclude(ans => ans.Question)
            .Include(a => a.Student)
            .FirstOrDefaultAsync(a => a.Id == attemptId);

        if (attempt == null)
            return ApiResponse<QuizAttemptResultDto>.FailResponse("Attempt not found");

        // Verify access: User must be the student OR the instructor of the course
        bool hasAccess = attempt.StudentId == userId;
        
        if (!hasAccess)
        {
            // Check if user is the instructor of the course
            var isInstructor = await _context.Courses
                .AnyAsync(c => c.Id == attempt.Quiz.CourseId && c.InstructorId == userId);
            
            // Also check if admin
            var isAdmin = await _context.Users
                .AnyAsync(u => u.Id == userId && u.Role == UserRole.Admin);

            hasAccess = isInstructor || isAdmin;
        }

        if (!hasAccess)
            return ApiResponse<QuizAttemptResultDto>.FailResponse("Unauthorized access to quiz result");

        var answerResults = attempt.Answers.Select(a => new QuizAnswerResultDto(
            a.QuestionId,
            a.Question.QuestionText,
            a.AnswerText,
            a.Question.CorrectAnswer,
            a.IsCorrect,
            a.MarksAwarded
        )).ToList();

        return ApiResponse<QuizAttemptResultDto>.SuccessResponse(new QuizAttemptResultDto(
            attempt.Id,
            attempt.QuizId,
            attempt.Quiz.Title,
            attempt.StudentId,
            $"{attempt.Student.FirstName} {attempt.Student.LastName}",
            attempt.StartedAt,
            attempt.SubmittedAt,
            attempt.Score ?? 0,
            attempt.Percentage ?? 0,
            attempt.Quiz.TotalMarks,
            answerResults
        ));
    }

    public async Task<ApiResponse<List<QuizAttemptResultDto>>> GetStudentAttemptsAsync(Guid studentId, Guid? quizId = null)
    {
        var query = _context.QuizAttempts
            .Include(a => a.Quiz)
            .Include(a => a.Student)
            .Where(a => a.StudentId == studentId && a.IsCompleted);

        if (quizId.HasValue)
            query = query.Where(a => a.QuizId == quizId.Value);

        var attempts = await query.OrderByDescending(a => a.SubmittedAt).ToListAsync();

        var results = attempts.Select(a => new QuizAttemptResultDto(
            a.Id,
            a.QuizId,
            a.Quiz.Title,
            a.StudentId,
            $"{a.Student.FirstName} {a.Student.LastName}",
            a.StartedAt,
            a.SubmittedAt,
            a.Score ?? 0,
            a.Percentage ?? 0,
            a.Quiz.TotalMarks,
            null
        )).ToList();

        return ApiResponse<List<QuizAttemptResultDto>>.SuccessResponse(results);
    }

    public async Task<ApiResponse<List<QuizAttemptResultDto>>> GetQuizAttemptsAsync(Guid quizId)
    {
        var attempts = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .Include(a => a.Student)
            .Where(a => a.QuizId == quizId && a.IsCompleted)
            .OrderByDescending(a => a.Score)
            .ToListAsync();

        var results = attempts.Select(a => new QuizAttemptResultDto(
            a.Id,
            a.QuizId,
            a.Quiz.Title,
            a.StudentId,
            $"{a.Student.FirstName} {a.Student.LastName}",
            a.StartedAt,
            a.SubmittedAt,
            a.Score ?? 0,
            a.Percentage ?? 0,
            a.Quiz.TotalMarks,
            null
        )).ToList();

        return ApiResponse<List<QuizAttemptResultDto>>.SuccessResponse(results);
    }

    private QuizDto MapToDto(Quiz quiz)
    {
        return new QuizDto(
            quiz.Id,
            quiz.Title,
            quiz.Description,
            quiz.DurationMinutes,
            quiz.StartTime,
            quiz.EndTime,
            quiz.TotalMarks,
            quiz.IsActive,
            quiz.ShuffleQuestions,
            quiz.MaxAttempts,
            quiz.CourseId ?? Guid.Empty,
            quiz.Course?.Name ?? "",
            quiz.Questions?.Count ?? 0,
            quiz.Attempts?.Count ?? 0,
            quiz.CreatedAt
        );
    }
}
