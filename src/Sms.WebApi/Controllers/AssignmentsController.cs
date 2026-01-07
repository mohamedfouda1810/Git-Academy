using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sms.Application.DTOs.Assignment;
using Sms.Application.DTOs.Common;
using Sms.Application.Interfaces;

namespace Sms.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly IAssignmentService _assignmentService;

    public AssignmentsController(IAssignmentService assignmentService)
    {
        _assignmentService = assignmentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAssignments([FromQuery] PagedRequest request, [FromQuery] Guid? subjectId)
    {
        var result = await _assignmentService.GetAssignmentsAsync(request, subjectId);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAssignment(Guid id)
    {
        var result = await _assignmentService.GetByIdAsync(id);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    [HttpGet("my-assignments")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyAssignments()
    {
        var userId = GetUserId();
        var result = await _assignmentService.GetStudentAssignmentsAsync(userId);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> CreateAssignment([FromBody] CreateAssignmentRequest request)
    {
        var userId = GetUserId();
        var result = await _assignmentService.CreateAsync(request, userId);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetAssignment), new { id = result.Data?.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> UpdateAssignment(Guid id, [FromBody] UpdateAssignmentRequest request)
    {
        var result = await _assignmentService.UpdateAsync(id, request);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> DeleteAssignment(Guid id)
    {
        var result = await _assignmentService.DeleteAsync(id);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("{id}/submit")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> SubmitAssignment(Guid id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { Success = false, Message = "No file provided" });

        var userId = GetUserId();
        using var stream = file.OpenReadStream();
        var result = await _assignmentService.SubmitAssignmentAsync(id, userId, stream, file.FileName, file.Length);
        
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("{id}/submissions")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> GetSubmissions(Guid id)
    {
        var result = await _assignmentService.GetSubmissionsAsync(id);
        return Ok(result);
    }

    [HttpGet("{id}/my-submission")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMySubmission(Guid id)
    {
        var userId = GetUserId();
        var result = await _assignmentService.GetStudentSubmissionAsync(id, userId);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    [HttpPost("submissions/{submissionId}/grade")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> GradeSubmission(Guid submissionId, [FromBody] GradeSubmissionRequest request)
    {
        var userId = GetUserId();
        var result = await _assignmentService.GradeSubmissionAsync(submissionId, request, userId);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("submissions/{submissionId}/download")]
    [Authorize]
    public async Task<IActionResult> DownloadSubmission(Guid submissionId)
    {
        var result = await _assignmentService.DownloadSubmissionAsync(submissionId);
        if (!result.Success)
            return NotFound(result);
        
        return File(result.Data!, "application/octet-stream");
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
