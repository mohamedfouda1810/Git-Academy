using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Sms.Application.Interfaces;

namespace Sms.WebApi.Controllers;

[ApiController]
[Route("api/files")]
public class FilesController : ControllerBase
{
    private readonly IFileStorageService _fileStorageService;
    private readonly FileExtensionContentTypeProvider _contentTypeProvider;

    public FilesController(IFileStorageService fileStorageService)
    {
        _fileStorageService = fileStorageService;
        _contentTypeProvider = new FileExtensionContentTypeProvider();
    }

    [HttpGet("{*filePath}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFile(string filePath)
    {
        try
        {
            if (string.IsNullOrEmpty(filePath))
                return BadRequest("File path is required");

            var stream = await _fileStorageService.DownloadFileAsync(filePath);
            
            if (!_contentTypeProvider.TryGetContentType(filePath, out var contentType))
            {
                contentType = "application/octet-stream";
            }

            // For PDFs and videos, set appropriate headers
            var fileName = Path.GetFileName(filePath);
            
            // Return file with correct content type
            return File(stream, contentType, enableRangeProcessing: true);
        }
        catch (FileNotFoundException)
        {
            return NotFound("File not found");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving file: {ex.Message}");
        }
    }

    [HttpGet("download/{*filePath}")]
    [AllowAnonymous]
    public async Task<IActionResult> DownloadFile(string filePath)
    {
        try
        {
            if (string.IsNullOrEmpty(filePath))
                return BadRequest("File path is required");

            var stream = await _fileStorageService.DownloadFileAsync(filePath);
            
            if (!_contentTypeProvider.TryGetContentType(filePath, out var contentType))
            {
                contentType = "application/octet-stream";
            }

            var fileName = Path.GetFileName(filePath);
            
            // Force download with Content-Disposition header
            return File(stream, contentType, fileName);
        }
        catch (FileNotFoundException)
        {
            return NotFound("File not found");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error downloading file: {ex.Message}");
        }
    }
}
