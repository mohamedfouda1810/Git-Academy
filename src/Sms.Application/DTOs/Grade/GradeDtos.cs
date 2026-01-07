namespace Sms.Application.DTOs.Grade;

/// <summary>
/// Individual grade item (assignment or quiz)
/// </summary>
public record GradeItemDto(
    Guid Id,
    string ItemType,       // "Assignment" or "Quiz"
    string ItemTitle,
    Guid CourseId,
    string CourseName,
    decimal Score,
    decimal MaxScore,
    decimal Percentage,
    DateTime GradedAt
);

/// <summary>
/// Summary of grades for a course
/// </summary>
public record CourseGradeSummaryDto(
    Guid CourseId,
    string CourseName,
    string CourseCode,
    decimal TotalEarned,
    decimal TotalPossible,
    decimal Percentage,
    int AssignmentCount,
    int QuizCount,
    List<GradeItemDto> Grades
);

/// <summary>
/// All grades for a student
/// </summary>
public record StudentGradesDto(
    List<CourseGradeSummaryDto> Courses,
    decimal OverallTotalEarned,
    decimal OverallTotalPossible,
    decimal OverallPercentage
);

/// <summary>
/// A single student's grade summary for instructor view
/// </summary>
public record StudentGradeSummaryDto(
    Guid StudentId,
    string StudentName,
    string StudentEmail,
    decimal TotalEarned,
    decimal TotalPossible,
    decimal Percentage,
    int CompletedAssignments,
    int CompletedQuizzes
);

/// <summary>
/// All student grades for a course (instructor view)
/// </summary>
public record InstructorCourseGradesDto(
    Guid CourseId,
    string CourseName,
    string CourseCode,
    int EnrolledCount,
    List<StudentGradeSummaryDto> Students
);

/// <summary>
/// All courses with student grades (instructor view)
/// </summary>
public record InstructorGradesDto(
    List<InstructorCourseGradesDto> Courses
);
