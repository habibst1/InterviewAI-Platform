public interface IStorageService
{
    Task<string> SaveAudio(IFormFile audioFile);
    Task DeleteAudio(string audioUrl);
}

public class TempFileStorageService : IStorageService
{
    private readonly string _tempPath;
    private readonly string _baseUrl;
    private readonly ILogger<TempFileStorageService> _logger;
    private readonly IWebHostEnvironment _env;


    public TempFileStorageService(IWebHostEnvironment env, IConfiguration config, ILogger<TempFileStorageService> logger)
    {
        _logger = logger;
        _env = env;

        // Save in wwwroot/audio instead of system temp
        _tempPath = Path.Combine(_env.WebRootPath ?? throw new InvalidOperationException("WebRootPath is not set"), "audio");
        _baseUrl = config["Storage:BaseUrl"] ?? "http://localhost:5143/audio";

        _logger.LogInformation("Initializing TempFileStorageService with path: {TempPath}", _tempPath);

        Directory.CreateDirectory(_tempPath); // Ensure directory exists
    }


    public async Task<string> SaveAudio(IFormFile audioFile)
    {
        if (audioFile == null)
        {
            _logger.LogError("Attempted to save null audio file");
            throw new ArgumentNullException(nameof(audioFile));
        }

        _logger.LogDebug("Saving audio file {FileName} ({Length} bytes)",
            audioFile.FileName, audioFile.Length);

        // 1. Try to get the extension from the original filename
        var originalExtension = Path.GetExtension(audioFile.FileName)?.ToLowerInvariant();

        // 2. If that fails or is empty, derive it from the MIME type
        string extensionToUse;
        if (string.IsNullOrEmpty(originalExtension) || originalExtension == ".")
        {
            _logger.LogDebug("Original filename '{OriginalFileName}' missing extension. Deriving from Content-Type '{ContentType}'.",
                             audioFile.FileName, audioFile.ContentType);

            extensionToUse = audioFile.ContentType?.ToLowerInvariant() switch
            {
                "audio/webm" => ".webm",
                "audio/mpeg" or "audio/mp3" => ".mp3", // 'audio/mpeg' is common for MP3
                "audio/wav" or "audio/x-wav" => ".wav",
                "audio/ogg" => ".ogg",
                "audio/aac" => ".aac",
                // Add more mappings as needed
                _ => ".webm" // Default fallback, or throw an exception for unsupported types
            };

            _logger.LogDebug("Derived extension '{DerivedExtension}' from Content-Type.", extensionToUse);
        }
        else
        {
            // 3. Use the original extension if it seems valid
            extensionToUse = originalExtension;
            _logger.LogDebug("Using extension '{Extension}' from original filename.", extensionToUse);
        }

        // 4. Generate the final filename with the determined extension
        var fileName = $"{Guid.NewGuid()}{extensionToUse}";
        var filePath = Path.Combine(_tempPath, fileName);

        try
        {
            // Log some metadata without exposing sensitive data
            _logger.LogTrace("Audio file metadata: ContentType={ContentType}, Headers={HeadersCount}, FinalFileName={FinalFileName}",
                audioFile.ContentType, audioFile.Headers?.Count ?? 0, fileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await audioFile.CopyToAsync(stream);
            }

            var fileInfo = new FileInfo(filePath);
            _logger.LogInformation("Successfully saved audio file {FileName} ({FileSize} bytes) at {FilePath}",
                fileName, fileInfo.Length, filePath);

            var audioUrl = $"{_baseUrl.TrimEnd('/')}/{fileName}";
            _logger.LogDebug("Generated audio URL: {AudioUrl}", audioUrl);

            return audioUrl;
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogError(ex, "Permission denied when saving audio file to {FilePath}", filePath);
            throw new Exception("Storage access denied", ex);
        }
        catch (IOException ex)
        {
            _logger.LogError(ex, "IO error while saving audio file to {FilePath}", filePath);
            throw new Exception("Storage operation failed", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while saving audio file");
            throw new Exception("Audio storage failed", ex);
        }
    }

    public Task DeleteAudio(string audioUrl)
    {
        if (string.IsNullOrWhiteSpace(audioUrl))
        {
            _logger.LogWarning("Attempted to delete audio with empty URL");
            return Task.CompletedTask;
        }

        _logger.LogDebug("Deleting audio file from URL: {AudioUrl}", audioUrl);

        try
        {
            var fileName = Path.GetFileName(audioUrl);
            if (string.IsNullOrEmpty(fileName))
            {
                _logger.LogWarning("Invalid audio URL format: {AudioUrl}", audioUrl);
                return Task.CompletedTask;
            }

            var filePath = Path.Combine(_tempPath, fileName);

            if (!File.Exists(filePath))
            {
                _logger.LogWarning("Audio file not found at {FilePath}", filePath);
                return Task.CompletedTask;
            }

            File.Delete(filePath);
            _logger.LogInformation("Successfully deleted audio file {FileName}", fileName);

            return Task.CompletedTask;
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogError(ex, "Permission denied when deleting audio file from {AudioUrl}", audioUrl);
            throw new Exception("Delete operation not permitted", ex);
        }
        catch (IOException ex)
        {
            _logger.LogError(ex, "IO error while deleting audio file from {AudioUrl}", audioUrl);
            throw new Exception("Delete operation failed", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while deleting audio file");
            throw new Exception("Audio deletion failed", ex);
        }
    }
}