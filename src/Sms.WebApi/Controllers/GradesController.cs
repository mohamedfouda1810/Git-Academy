using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sms.Application.Interfaces;

namespace Sms.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GradesController : ControllerBase
{
    private readonly IGradeService _gradeService;

    public GradesController(IGradeService gradeService)
    {
        _gradeService = gradeService;
    }

    private Guid UserId => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!);

    /// <summary>
    /// Get all grades for the current student, grouped by course
    /// </summary>
    [HttpGet("my-grades")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyGrades()
    {
        var result = await _gradeService.GetStudentGradesAsync(UserId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Get grades for a specific course
    /// </summary>
    [HttpGet("course/{courseId}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetCourseGrades(Guid courseId)
    {
        var result = await _gradeService.GetCourseGradesAsync(UserId, courseId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Get all enrolled students' grades for instructor's courses
    /// </summary>
    [HttpGet("instructor-grades")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetInstructorGrades()
    {
        var result = await _gradeService.GetInstructorGradesAsync(UserId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }
}
