using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Sms.Application.Interfaces;

namespace Sms.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private readonly string _basePath;
    private readonly ILogger<FileStorageService> _logger;

    public FileStorageService(IConfiguration configuration, ILogger<FileStorageService> logger)
    {
        _basePath = configuration["FileStorage:BasePath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
        _logger = logger;

        // Ensure base directory exists
        if (!Directory.Exists(_basePath))
            Directory.CreateDirectory(_basePath);
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string folder)
    {
        try
        {
            // Security: limit file size (100MB for videos)
            const long maxFileSize = 100 * 1024 * 1024;
            if (fileStream.Length > maxFileSize)
                throw new InvalidOperationException("File size exceeds 100MB limit");

            // Security: validate extension
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            var allowedExtensions = new[] { 
                ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png",
                ".mp4", ".webm", ".mov", ".avi", ".mkv"  // Video formats
            };
            if (!allowedExtensions.Contains(ext))
                throw new InvalidOperationException($"File type '{ext}' not allowed");

            // Security: sanitize folder path to prevent directory traversal
            var safeFolder = Path.GetFileName(folder); 
            var folderPath = Path.Combine(_basePath, safeFolder);
            
            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            // Generate unique filename
            var uniqueFileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(folderPath, uniqueFileName);

            using var fileStreamOut = new FileStream(filePath, FileMode.Create, FileAccess.Write);
            await fileStream.CopyToAsync(fileStreamOut);

            var relativePath = Path.Combine(safeFolder, uniqueFileName);
            _logger.LogInformation("File uploaded successfully: {FilePath}", relativePath);

            return relativePath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload file: {FileName}", fileName);
            throw;
        }
    }

    public async Task<Stream> DownloadFileAsync(string filePath)
    {
        // Security: sanitize path to prevent traversal
        var safePath = filePath.Replace("..", "").Replace("\\", "/");
        var fullPath = Path.Combine(_basePath, safePath);
        
        if (!File.Exists(fullPath)) 
            throw new FileNotFoundException("File not found");

        // Return FileStream directly to avoid memory leak with large files
        // The caller (Controller) must dispose this stream
        return new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
    }
    
    // ... delete and other methods remain ...
    public Task DeleteFileAsync(string filePath)
    {
        var safePath = filePath.Replace("..", "").Replace("\\", "/");
        var fullPath = Path.Combine(_basePath, safePath);
        
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            _logger.LogInformation("File deleted: {FilePath}", filePath);
        }

        return Task.CompletedTask;
    }

    public bool FileExists(string filePath)
    {
        var safePath = filePath.Replace("..", "").Replace("\\", "/");
        var fullPath = Path.Combine(_basePath, safePath);
        return File.Exists(fullPath);
    }

    public string GetFileUrl(string filePath)
    {
        // Ensure forward slashes for URLs
        return $"/api/files/{filePath.Replace("\\", "/")}";
    }
}
