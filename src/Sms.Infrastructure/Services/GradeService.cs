using Microsoft.EntityFrameworkCore;
using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Grade;
using Sms.Application.Interfaces;
using Sms.Domain.Enums;
using Sms.Infrastructure.Data;

namespace Sms.Infrastructure.Services;

public class GradeService : IGradeService
{
    private readonly ApplicationDbContext _context;

    public GradeService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<StudentGradesDto>> GetStudentGradesAsync(Guid studentId)
    {
        // Get enrolled courses
        var enrolledCourseIds = await _context.Enrollments
            .Where(e => e.StudentId == studentId && e.IsActive)
            .Select(e => e.CourseId)
            .ToListAsync();

        // Get graded assignment submissions
        var assignmentGrades = await _context.AssignmentSubmissions
            .Include(s => s.Assignment)
            .ThenInclude(a => a.Course)
            .Where(s => s.StudentId == studentId && s.Status == SubmissionStatus.Graded && s.Score.HasValue)
            .Select(s => new GradeItemDto(
                s.Id,
                "Assignment",
                s.Assignment.Title,
                s.Assignment.CourseId,
                s.Assignment.Course.Name,
                s.Score!.Value,
                s.Assignment.MaxScore,
                s.Assignment.MaxScore > 0 ? Math.Round((s.Score!.Value / s.Assignment.MaxScore) * 100, 1) : 0,
                s.SubmittedAt
            ))
            .ToListAsync();

        // Get graded quiz attempts
        var quizGrades = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .ThenInclude(q => q.Course)
            .Where(a => a.StudentId == studentId && a.IsCompleted && a.Score.HasValue && a.Quiz.CourseId.HasValue)
            .Select(a => new GradeItemDto(
                a.Id,
                "Quiz",
                a.Quiz.Title,
                a.Quiz.CourseId!.Value,
                a.Quiz.Course!.Name,
                a.Score!.Value,
                a.Quiz.Questions.Sum(q => q.Marks),
                a.Quiz.Questions.Sum(q => q.Marks) > 0 
                    ? Math.Round((a.Score!.Value / a.Quiz.Questions.Sum(q => q.Marks)) * 100, 1) 
                    : 0,
                a.SubmittedAt ?? a.StartedAt
            ))
            .ToListAsync();

        // Combine all grades
        var allGrades = assignmentGrades.Concat(quizGrades).ToList();

        // Group by course
        var courseGroups = allGrades
            .GroupBy(g => new { g.CourseId, g.CourseName })
            .Select(group => {
                var totalEarned = group.Sum(g => g.Score);
                var totalPossible = group.Sum(g => g.MaxScore);
                var percentage = totalPossible > 0 ? Math.Round((totalEarned / totalPossible) * 100, 1) : 0;
                
                return new CourseGradeSummaryDto(
                    group.Key.CourseId,
                    group.Key.CourseName,
                    "", // Will populate course code below
                    totalEarned,
                    totalPossible,
                    percentage,
                    group.Count(g => g.ItemType == "Assignment"),
                    group.Count(g => g.ItemType == "Quiz"),
                    group.OrderByDescending(g => g.GradedAt).ToList()
                );
            })
            .ToList();

        // Get course codes
        var courseIds = courseGroups.Select(c => c.CourseId).ToList();
        var courses = await _context.Courses
            .Where(c => courseIds.Contains(c.Id))
            .Select(c => new { c.Id, c.Code })
            .ToDictionaryAsync(c => c.Id, c => c.Code);

        // Update with course codes
        var coursesWithCodes = courseGroups.Select(c => c with { CourseCode = courses.GetValueOrDefault(c.CourseId, "") }).ToList();

        // Calculate overall totals
        var overallEarned = allGrades.Sum(g => g.Score);
        var overallPossible = allGrades.Sum(g => g.MaxScore);
        var overallPercentage = overallPossible > 0 ? Math.Round((overallEarned / overallPossible) * 100, 1) : 0;

        return ApiResponse<StudentGradesDto>.SuccessResponse(new StudentGradesDto(
            coursesWithCodes,
            overallEarned,
            overallPossible,
            overallPercentage
        ));
    }

    public async Task<ApiResponse<CourseGradeSummaryDto>> GetCourseGradesAsync(Guid studentId, Guid courseId)
    {
        var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
        if (course == null)
            return ApiResponse<CourseGradeSummaryDto>.FailResponse("Course not found");

        // Get graded assignment submissions for this course
        var assignmentGrades = await _context.AssignmentSubmissions
            .Include(s => s.Assignment)
            .Where(s => s.StudentId == studentId 
                && s.Assignment.CourseId == courseId 
                && s.Status == SubmissionStatus.Graded 
                && s.Score.HasValue)
            .Select(s => new GradeItemDto(
                s.Id,
                "Assignment",
                s.Assignment.Title,
                courseId,
                course.Name,
                s.Score!.Value,
                s.Assignment.MaxScore,
                s.Assignment.MaxScore > 0 ? Math.Round((s.Score!.Value / s.Assignment.MaxScore) * 100, 1) : 0,
                s.SubmittedAt
            ))
            .ToListAsync();

        // Get graded quiz attempts for this course
        var quizGrades = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .Where(a => a.StudentId == studentId 
                && a.Quiz.CourseId == courseId 
                && a.IsCompleted 
                && a.Score.HasValue)
            .Select(a => new GradeItemDto(
                a.Id,
                "Quiz",
                a.Quiz.Title,
                courseId,
                course.Name,
                a.Score!.Value,
                a.Quiz.Questions.Sum(q => q.Marks),
                a.Quiz.Questions.Sum(q => q.Marks) > 0 
                    ? Math.Round((a.Score!.Value / a.Quiz.Questions.Sum(q => q.Marks)) * 100, 1) 
                    : 0,
                a.SubmittedAt ?? a.StartedAt
            ))
            .ToListAsync();

        var allGrades = assignmentGrades.Concat(quizGrades).OrderByDescending(g => g.GradedAt).ToList();

        var totalEarned = allGrades.Sum(g => g.Score);
        var totalPossible = allGrades.Sum(g => g.MaxScore);
        var percentage = totalPossible > 0 ? Math.Round((totalEarned / totalPossible) * 100, 1) : 0;

        return ApiResponse<CourseGradeSummaryDto>.SuccessResponse(new CourseGradeSummaryDto(
            courseId,
            course.Name,
            course.Code,
            totalEarned,
            totalPossible,
            percentage,
            assignmentGrades.Count,
            quizGrades.Count,
            allGrades
        ));
    }

    public async Task<ApiResponse<InstructorGradesDto>> GetInstructorGradesAsync(Guid instructorId)
    {
        // Get instructor's courses
        var courses = await _context.Courses
            .Where(c => c.InstructorId == instructorId)
            .ToListAsync();

        var courseGrades = new List<InstructorCourseGradesDto>();

        foreach (var course in courses)
        {
            // Get enrolled students
            var enrollments = await _context.Enrollments
                .Include(e => e.Student)
                .Where(e => e.CourseId == course.Id && e.IsActive)
                .ToListAsync();

            var studentGrades = new List<StudentGradeSummaryDto>();

            foreach (var enrollment in enrollments)
            {
                var studentId = enrollment.StudentId;

                // Get assignment grades for this student in this course
                var assignmentScores = await _context.AssignmentSubmissions
                    .Include(s => s.Assignment)
                    .Where(s => s.StudentId == studentId 
                        && s.Assignment.CourseId == course.Id 
                        && s.Status == SubmissionStatus.Graded 
                        && s.Score.HasValue)
                    .Select(s => new { s.Score, s.Assignment.MaxScore })
                    .ToListAsync();

                // Get quiz grades for this student in this course
                var quizScores = await _context.QuizAttempts
                    .Include(a => a.Quiz)
                    .ThenInclude(q => q.Questions)
                    .Where(a => a.StudentId == studentId 
                        && a.Quiz.CourseId == course.Id 
                        && a.IsCompleted 
                        && a.Score.HasValue)
                    .Select(a => new { a.Score, MaxScore = a.Quiz.Questions.Sum(q => q.Marks) })
                    .ToListAsync();

                var totalEarned = assignmentScores.Sum(s => s.Score ?? 0) + quizScores.Sum(s => s.Score ?? 0);
                var totalPossible = assignmentScores.Sum(s => (decimal)s.MaxScore) + quizScores.Sum(s => (decimal)s.MaxScore);
                var percentage = totalPossible > 0 ? Math.Round((totalEarned / totalPossible) * 100, 1) : 0;

                studentGrades.Add(new StudentGradeSummaryDto(
                    studentId,
                    enrollment.Student.FullName,
                    enrollment.Student.Email ?? "",
                    totalEarned,
                    totalPossible,
                    percentage,
                    assignmentScores.Count,
                    quizScores.Count
                ));
            }

            courseGrades.Add(new InstructorCourseGradesDto(
                course.Id,
                course.Name,
                course.Code,
                enrollments.Count,
                studentGrades.OrderByDescending(s => s.Percentage).ToList()
            ));
        }

        return ApiResponse<InstructorGradesDto>.SuccessResponse(new InstructorGradesDto(courseGrades));
    }
}
