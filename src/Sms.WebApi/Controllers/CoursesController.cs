using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Course;
using Sms.Application.DTOs.Session;
using Sms.Application.Interfaces;

namespace Sms.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly ICourseService _courseService;

    public CoursesController(ICourseService courseService)
    {
        _courseService = courseService;
    }

    #region Course Endpoints

    [HttpGet]
    public async Task<IActionResult> GetCourses([FromQuery] CourseFilterRequest filter)
    {
        var result = await _courseService.GetCoursesAsync(filter);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCourse(Guid id)
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            var userId = GetUserId();
            var result = await _courseService.GetCourseDetailsAsync(id, userId);
            if (!result.Success)
                return NotFound(result);
            return Ok(result);
        }
        else
        {
            var result = await _courseService.GetCoursePreviewAsync(id);
            if (!result.Success)
                return NotFound(result);
            return Ok(result);
        }
    }

    [HttpGet("{id}/preview")]
    public async Task<IActionResult> GetCoursePreview(Guid id)
    {
        var result = await _courseService.GetCoursePreviewAsync(id);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    [HttpGet("{id}/details")]
    [Authorize]
    public async Task<IActionResult> GetCourseDetails(Guid id)
    {
        var userId = GetUserId();
        var result = await _courseService.GetCourseDetailsAsync(id, userId);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest request)
    {
        var userId = GetUserId();
        var result = await _courseService.CreateAsync(request, userId);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetCourse), new { id = result.Data?.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] UpdateCourseRequest request)
    {
        var result = await _courseService.UpdateAsync(id, request);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteCourse(Guid id)
    {
        var result = await _courseService.DeleteAsync(id);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    #endregion

    #region Session Endpoints

    [HttpGet("{courseId}/sessions")]
    [Authorize]
    public async Task<IActionResult> GetCourseSessions(Guid courseId)
    {
        var userId = GetUserId();
        var result = await _courseService.GetCourseSessionsAsync(courseId, userId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("{courseId}/sessions/{sessionId}")]
    [Authorize]
    public async Task<IActionResult> GetSession(Guid courseId, Guid sessionId)
    {
        var userId = GetUserId();
        var result = await _courseService.GetSessionAsync(courseId, sessionId, userId);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    [HttpPost("{courseId}/sessions")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> CreateSession(Guid courseId, [FromBody] CreateSessionRequest request)
    {
        var userId = GetUserId();
        var result = await _courseService.CreateSessionAsync(courseId, request, userId);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetSession), new { courseId, sessionId = result.Data?.Id }, result);
    }

    [HttpPut("{courseId}/sessions/{sessionId}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> UpdateSession(Guid courseId, Guid sessionId, [FromBody] UpdateSessionRequest request)
    {
        var result = await _courseService.UpdateSessionAsync(courseId, sessionId, request);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("{courseId}/sessions/{sessionId}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> DeleteSession(Guid courseId, Guid sessionId)
    {
        var result = await _courseService.DeleteSessionAsync(courseId, sessionId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("{courseId}/sessions/{sessionId}/upload")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> UploadSessionContent(Guid courseId, Guid sessionId, IFormFile file, [FromQuery] string type)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse.FailResponse("No file provided"));

        if (type != "pdf" && type != "video")
            return BadRequest(ApiResponse.FailResponse("Type must be 'pdf' or 'video'"));

        using var stream = file.OpenReadStream();
        var result = await _courseService.UploadSessionContentAsync(courseId, sessionId, stream, file.FileName, type);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("{courseId}/sessions/{sessionId}/quiz")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> CreateSessionQuiz(Guid courseId, Guid sessionId, [FromBody] CreateSessionQuizRequest request)
    {
        var userId = GetUserId();
        var result = await _courseService.CreateSessionQuizAsync(courseId, sessionId, request, userId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    #endregion

    #region Enrollment Endpoints

    [HttpPost("enroll")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Enroll([FromBody] EnrollmentRequest request)
    {
        var userId = GetUserId();
        var result = await _courseService.EnrollStudentAsync(userId, request);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("{courseId}/unenroll")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Unenroll(Guid courseId)
    {
        var userId = GetUserId();
        var result = await _courseService.UnenrollStudentAsync(userId, courseId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("my-enrollments")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyEnrollments()
    {
        var userId = GetUserId();
        var result = await _courseService.GetStudentEnrollmentsAsync(userId);
        return Ok(result);
    }

    [HttpGet("my-courses")]
    [Authorize(Roles = "Instructor")]
    public async Task<IActionResult> GetMyCourses()
    {
        var userId = GetUserId();
        var result = await _courseService.GetInstructorCoursesAsync(userId);
        return Ok(result);
    }

    [HttpGet("{courseId}/enrollments")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> GetCourseEnrollments(Guid courseId)
    {
        var result = await _courseService.GetCourseEnrollmentsAsync(courseId);
        return Ok(result);
    }

    [HttpPost("enrollments/{enrollmentId}/grade")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> SetFinalGrade(Guid enrollmentId, [FromBody] SetGradeRequest request)
    {
        var result = await _courseService.SetFinalGradeAsync(enrollmentId, request.Grade);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    #endregion

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }
}

public record SetGradeRequest(decimal Grade);
