using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sms.Application.DTOs.Common;
using Sms.Application.DTOs.Quiz;
using Sms.Application.Interfaces;

namespace Sms.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuizzesController : ControllerBase
{
    private readonly IQuizService _quizService;

    public QuizzesController(IQuizService quizService)
    {
        _quizService = quizService;
    }

    [HttpGet]
    public async Task<IActionResult> GetQuizzes([FromQuery] PagedRequest request, [FromQuery] Guid? subjectId)
    {
        var userId = GetUserId();
        var result = await _quizService.GetQuizzesAsync(request, subjectId, userId);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetQuiz(Guid id)
    {
        var result = await _quizService.GetByIdAsync(id);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> CreateQuiz([FromBody] CreateQuizRequest request)
    {
        var userId = GetUserId();
        var result = await _quizService.CreateAsync(request, userId);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetQuiz), new { id = result.Data?.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> UpdateQuiz(Guid id, [FromBody] UpdateQuizRequest request)
    {
        var result = await _quizService.UpdateAsync(id, request);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> DeleteQuiz(Guid id)
    {
        var result = await _quizService.DeleteAsync(id);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("{id}/take")]
    // ... items ...
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetQuizForTaking(Guid id)
    {
        var userId = GetUserId();
        var result = await _quizService.GetQuizForTakingAsync(id, userId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("{id}/start")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> StartQuiz(Guid id)
    {
        var userId = GetUserId();
        var result = await _quizService.StartAttemptAsync(id, userId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("submit")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> SubmitQuiz([FromBody] SubmitQuizRequest request)
    {
        var userId = GetUserId();
        var result = await _quizService.SubmitAttemptAsync(request, userId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("attempts/{attemptId}")]
    [Authorize] // Access logic handled in service (Student, Instructor, Admin)
    public async Task<IActionResult> GetAttemptResult(Guid attemptId)
    {
        var userId = GetUserId();
        var result = await _quizService.GetAttemptResultAsync(attemptId, userId);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    [HttpGet("my-attempts")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyAttempts([FromQuery] Guid? quizId)
    {
        var userId = GetUserId();
        var result = await _quizService.GetStudentAttemptsAsync(userId, quizId);
        return Ok(result);
    }

    [HttpGet("{id}/attempts")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> GetQuizAttempts(Guid id)
    {
        var result = await _quizService.GetQuizAttemptsAsync(id);
        return Ok(result);
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
