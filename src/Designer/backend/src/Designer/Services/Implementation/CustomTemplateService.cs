using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Exceptions.CustomTemplate;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NJsonSchema;
using NJsonSchema.Validation;

namespace Altinn.Studio.Designer.Services.Implementation;

public class CustomTemplateService : ICustomTemplateService
{
    private const string SchemaFileName = "customtemplate.schema.json";
    private const string AltinnStudioOrg = "als";
    private const string TemplateFolder = "Templates/";
    private const string TemplateContentFolder = "content";
    private const string TemplateFileName = "template.json";
    private const string TemplateManifestFileName = "templateManifest.json";

    private const string LocalTemplateCacheFolder = ".template-cache";
    private const string CacheMetadataFileName = ".cache-info.json";

    private const int MaxParallelDownloads = 15;
    private const int LockMaxRetries = 30;
    private const int LockRetryDelayMs = 1000;
    private static readonly TimeSpan s_cacheExpiration = TimeSpan.FromDays(7);

    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IGiteaClient _giteaClient;
    private readonly ILogger<CustomTemplateService> _logger;
    private readonly ServiceRepositorySettings _settings;

    public string AppTemplateManifestSchemaLocation { get; } = Path.Combine(AppContext.BaseDirectory, "Schemas", SchemaFileName);

    public CustomTemplateService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IGiteaClient giteaClient, ILogger<CustomTemplateService> logger, ServiceRepositorySettings settings)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _giteaClient = giteaClient;
        _logger = logger;
        _settings = settings;
    }

    // <inheritdoc />
    public async Task<List<CustomTemplate>> GetCustomTemplateList()
    {
        List<CustomTemplate> templates = [];

        templates.AddRange(await GetTemplateManifestForOrg(AltinnStudioOrg));

        return templates;
    }

    // <inheritdoc />
    public async Task ApplyTemplateToRepository(string templateOwner, string templateId, string targetOrg, string targetRepo, string developer)
    {
        CustomTemplate template = await GetCustomTemplate(templateOwner, templateId); // called first as it includes validation of the template

        await CopyTemplateContentToRepository(templateOwner, templateId, targetOrg, targetRepo, developer);
        foreach (string removePath in template.Remove)
        {
            DeleteContent(targetOrg, targetRepo, developer, removePath);
        }
    }

    /// <summary>
    /// Validates a JSON string against the AppTemplateManifest JSON schema using NJsonSchema.
    /// </summary>
    /// <param name="jsonString">The JSON string to validate.</param>
    /// <returns>A list of validation errors. Empty if valid.</returns>
    internal static async Task<ICollection<ValidationError>> ValidateManifestJsonAsync(string jsonString)
    {
        if (string.IsNullOrWhiteSpace(jsonString))
        {
            throw new ArgumentException("JSON string must not be null or empty.", nameof(jsonString));
        }

        string schemaPath = Path.Combine(AppContext.BaseDirectory, "Schemas", SchemaFileName);

        if (!File.Exists(schemaPath))
        {
            throw new FileNotFoundException($"Application Template Manifest Schema file not found at {schemaPath}");
        }

        var schema = await JsonSchema.FromFileAsync(schemaPath);
        var errors = schema.Validate(jsonString);

        return errors;
    }

    private async Task<List<CustomTemplate>> GetTemplateManifestForOrg(string templateOwner, CancellationToken cancellationToken = default)
    {
        string templateRepo = GetContentRepoName(templateOwner);
        string templateCacheFolderPath = Path.Combine(_settings.RepositoryLocation, LocalTemplateCacheFolder, templateOwner);
        string templateManifestCachePath = Path.Combine(_settings.RepositoryLocation, LocalTemplateCacheFolder, templateOwner, TemplateManifestFileName);

        string lockFilePath = Path.Combine(templateCacheFolderPath, ".lock");

        using FileStream? lockStream = await AcquireFileLockAsync(lockFilePath, cancellationToken);

        try
        {
            string latestCommitSha = await _giteaClient.GetLatestCommitOnBranch(templateOwner, templateRepo);
            bool cacheValid = await IsCacheValidAsync(templateCacheFolderPath, latestCommitSha);

            if (!cacheValid)
            {
                _logger.LogInformation("Template manifest missing for {templateOwner}. Downloading from API...", templateOwner);
                await DownloadTemplateManifestToCache(templateOwner, templateRepo, templateManifestCachePath, latestCommitSha);
            }
            else
            {
                _logger.LogInformation("Template manifest hit for {templateOwner}. Using cached file.", templateOwner);
            }

            string cachedTemplateList = await File.ReadAllTextAsync(templateManifestCachePath);
            List<CustomTemplate> templates = JsonSerializer.Deserialize<List<CustomTemplate>>(cachedTemplateList) ?? [];
            return templates;
        }
        catch
        {
            _logger.LogError("// CustomTemplateService // GetTemplateManifestForOrg // Failed to get template manifest for org {TemplateOwner}", templateOwner);
            throw;
        }
    }

    private async Task DownloadTemplateManifestToCache(string owner, string repo, string cacheFilePath, string commitSha)
    {
        string remoteTemplateManifestPath = Path.Combine(TemplateFolder, TemplateManifestFileName);
        (FileSystemObject? file, ProblemDetails? problem) = await _giteaClient.GetFileAndErrorAsync(owner, repo, remoteTemplateManifestPath, null); // passing null as reference to get main branch and latest commit

        if (problem != null)
        {
            switch (problem.Status)
            {
                case 404:
                    throw CustomTemplateException.NotFound($"Template list for owner '{owner}' not found");
                default:
                    throw CustomTemplateException.DeserializationFailed($"An error occurred while retrieving the template list for owner '{owner}'.", problem.Detail);
            }
        }

        string jsonString = Encoding.UTF8.GetString(Convert.FromBase64String(file.Content));

        await File.WriteAllTextAsync(cacheFilePath, jsonString);

        var cacheInfo = new TemplateCacheInfo
        {
            CommitSha = commitSha,
            CachedAt = DateTime.UtcNow,
        };

        string metadataPath = Path.Combine(Path.GetDirectoryName(cacheFilePath)!, CacheMetadataFileName);
        string metadataJson = JsonSerializer.Serialize(cacheInfo, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(metadataPath, metadataJson);

        _logger.LogInformation("Cached template manifest for owner {Owner} (commit: {CommitSha})",
             owner, commitSha[..7]);
    }

    private async Task<CustomTemplate> GetCustomTemplate(string owner, string id)
    {
        string templateRepo = GetContentRepoName(owner);

        try
        {
            string baseCommitSha = await _giteaClient.GetLatestCommitOnBranch(owner, templateRepo);
            string path = Path.Combine(TemplateFolder, id, TemplateFileName);

            (FileSystemObject? file, ProblemDetails? problem) = await _giteaClient.GetFileAndErrorAsync(owner, templateRepo, path, null); // passing null as reference to get main branch and latest commit

            if (problem != null)
            {
                switch (problem.Status)
                {
                    case 404:
                        throw CustomTemplateException.NotFound($"Template '{id}' not found");
                    default:
                        throw CustomTemplateException.DeserializationFailed("An error occurred while retrieving the template.", problem.Detail);
                }
            }

            string templateContent = Encoding.UTF8.GetString(Convert.FromBase64String(file.Content));
            var validationResult = await ValidateManifestJsonAsync(templateContent);

            if (validationResult.Count > 0)
            {
                throw CustomTemplateException.ValidationFailed("Template validation failed.", validationResult);
            }

            CustomTemplate? template = JsonSerializer.Deserialize<CustomTemplate>(templateContent);
            if (template == null)
            {
                throw CustomTemplateException.DeserializationFailed("An error occurred while deserializing the template.");
            }

            return template;
        }
        catch (Exception ex)
        {
            throw CustomTemplateException.DeserializationFailed("JSON parsing failed", ex.Message, ex);
        }
    }

    private void DeleteContent(string org, string repository, string developer, string path)
    {
        // remove paths are validated as part of template retrieval. So we can assume they are safe to use here.
        string targetPath = Path.Combine(_settings.GetServicePath(org, repository, developer), path);

        if (Directory.Exists(targetPath))
        {
            Directory.Delete(targetPath, true);
        }
        else if (File.Exists(targetPath))
        {
            File.Delete(targetPath);
        }
    }

    private async Task CopyTemplateContentToRepository(string templateOwner, string templateId, string targetOrg, string targetRepo, string developer, CancellationToken cancellationToken = default)
    {
        string templateRepo = GetContentRepoName(templateOwner);

        string templateCachePath = Path.Combine(_settings.RepositoryLocation, LocalTemplateCacheFolder, templateOwner, templateId);
        string lockFilePath = Path.Combine(templateCachePath, ".lock");
        string cacheTemplateContentPath = Path.Combine(templateCachePath, TemplateContentFolder);

        using FileStream? lockStream = await AcquireFileLockAsync(lockFilePath, cancellationToken);

        string latestCommitSha = await _giteaClient.GetLatestCommitOnBranch(templateOwner, templateRepo, null, cancellationToken);

        bool cacheValid = await IsCacheValidAsync(templateCachePath, latestCommitSha);

        if (!cacheValid)
        {
            _logger.LogInformation("Template cache miss for {TemplateId}. Downloading from API...", templateId);
            await DownloadTemplateToCache(templateOwner, templateRepo, templateId, templateCachePath, latestCommitSha, cancellationToken);
        }
        else
        {
            _logger.LogInformation("Template cache hit for {TemplateId}. Using cached files.", templateId);
        }

        AltinnAppGitRepository targetAppRepo = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(targetOrg, targetRepo, developer);
        CopyDirectory(cacheTemplateContentPath, targetAppRepo.RepositoryDirectory);
    }

    /// <summary>
    /// Acquires a file-based lock that works across multiple process instances.
    /// Uses exclusive file access to ensure only one instance downloads at a time.
    /// </summary>
    private async Task<FileStream?> AcquireFileLockAsync(string lockFilePath, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(lockFilePath)!);

        int retryCount = 0;
        int maxRetries = LockMaxRetries;
        int retryDelayMs = LockRetryDelayMs;

        while (retryCount < maxRetries)
        {
            try
            {
                var lockStream = new FileStream(
                    lockFilePath,
                    FileMode.OpenOrCreate,
                    FileAccess.ReadWrite,
                    FileShare.None,
                    bufferSize: 1,
                    FileOptions.DeleteOnClose
                );

                _logger.LogInformation("Acquired template cache lock: {LockFilePath} at {Time}", lockFilePath, DateTime.UtcNow);

                lockStream.Position = 0;
                return lockStream;
            }
            catch (IOException)
            {
                // Lock held by another instance, wait and retry
                _logger.LogDebug("Template cache lock held by another instance. Retry {RetryCount}/{MaxRetries}", retryCount + 1, maxRetries);
                await Task.Delay(retryDelayMs, cancellationToken);
                retryCount++;
            }
        }

        throw new TimeoutException($"Could not acquire template cache lock after {maxRetries} retries");
    }

    private static string GetContentRepoName(string org)
    {
        return $"{org}-content";
    }

    /// <summary>
    /// Checks cache validity using file-based metadata (works across instances).
    /// </summary>
    private async Task<bool> IsCacheValidAsync(string cachePath, string latestCommitSha)
    {
        if (!Directory.Exists(cachePath))
        {
            return false;
        }

        string metadataPath = Path.Combine(cachePath, CacheMetadataFileName);
        if (!File.Exists(metadataPath))
        {
            return false;
        }

        try
        {
            string metadataJson = await File.ReadAllTextAsync(metadataPath);
            TemplateCacheInfo? cacheInfo = JsonSerializer.Deserialize<TemplateCacheInfo>(metadataJson);

            if (cacheInfo == null)
            {
                return false;
            }

            // Cache is valid if commit SHA matches and cache is less than 1 week old
            bool commitMatches = cacheInfo.CommitSha.Equals(latestCommitSha, StringComparison.Ordinal);
            bool notExpired = DateTime.UtcNow - cacheInfo.CachedAt < s_cacheExpiration;

            return commitMatches && notExpired;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read cache metadata from {MetadataPath}", metadataPath);
            return false;
        }
    }

    private async Task DownloadTemplateToCache(
        string owner,
        string repo,
        string templateId,
        string cachePath,
        string commitSha,
        CancellationToken cancellationToken)
    {
        string remoteTemplateContentPath = Path.Combine(TemplateFolder, templateId, TemplateContentFolder);
        string cacheTemplateContentPath = Path.Combine(cachePath, TemplateContentFolder);

        // Get list of files in template
        List<FileSystemObject> contentFiles = await GetTemplateContentFilesRecursive(
            owner,
            repo,
            remoteTemplateContentPath,
            cancellationToken
        );

        if (contentFiles.Count == 0)
        {
            _logger.LogWarning("No content found for template '{TemplateId}'", templateId);
            return;
        }

        // Clear old cache content
        if (Directory.Exists(cacheTemplateContentPath))
        {
            Directory.Delete(cacheTemplateContentPath, recursive: true);
        }

        Directory.CreateDirectory(cacheTemplateContentPath);

        _logger.LogInformation("Copying template '{TemplateId}' with {FileCount} files via API download", templateId, contentFiles.Count);

        // Download files in parallel
        ParallelOptions options = new()
        {
            MaxDegreeOfParallelism = MaxParallelDownloads,
            CancellationToken = cancellationToken
        };

        await Parallel.ForEachAsync(contentFiles, options, async (fileMetadata, token) =>
        {
            (FileSystemObject? file, ProblemDetails? problem) = await _giteaClient.GetFileAndErrorAsync(
                owner,
                repo,
                fileMetadata.Path,
                null,
                token
            );

            if (problem != null)
            {
                throw CustomTemplateException.DeserializationFailed(
                    $"Failed to download template file: {fileMetadata.Path}",
                    problem.Detail
                );
            }

            // Calculate relative path and save to cache
            string relativePath = GetRelativePathWithinContent(fileMetadata.Path, remoteTemplateContentPath);
            string targetPath = Path.Combine(cacheTemplateContentPath, relativePath);

            Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);

            byte[] content = Convert.FromBase64String(file.Content);
            await File.WriteAllBytesAsync(targetPath, content, token);
        });

        var cacheInfo = new TemplateCacheInfo
        {
            CommitSha = commitSha,
            CachedAt = DateTime.UtcNow,
        };

        string metadataPath = Path.Combine(cachePath, CacheMetadataFileName);
        string metadataJson = JsonSerializer.Serialize(cacheInfo, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(metadataPath, metadataJson, cancellationToken);

        _logger.LogInformation("Cached {FileCount} files for template {TemplateId} (commit: {CommitSha})",
            contentFiles.Count, templateId, commitSha[..7]);
    }

    private async Task<List<FileSystemObject>> GetTemplateContentFilesRecursive(
        string owner,
        string repo,
        string path,
        CancellationToken cancellationToken)
    {
        List<FileSystemObject> files = [];

        try
        {
            List<FileSystemObject> directoryContent = await _giteaClient.GetDirectoryAsync(
                owner,
                repo,
                path,
                null,  // Default branch
                cancellationToken
            );

            foreach (FileSystemObject element in directoryContent)
            {
                if (element.Type == "file")
                {
                    files.Add(element);
                }
                else if (element.Type == "dir")
                {
                    string subdirPath = $"{path.TrimEnd('/')}/{element.Name}";
                    List<FileSystemObject> subdirFiles = await GetTemplateContentFilesRecursive(
                        owner,
                        repo,
                        subdirPath,
                        cancellationToken
                    );
                    files.AddRange(subdirFiles);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enumerate template content at {Path}", path);
            throw CustomTemplateException.NotFound($"Template content not found at {path}");
        }

        return files;
    }

    private string GetRelativePathWithinContent(string fullPath, string templateContentPath)
    {
        // fullPath: "Templates/my-template/content/subfolder/file.cs"
        // templateContentPath: "Templates/my-template/content"
        // result: "subfolder/file.cs"

        string normalizedFullPath = fullPath.Replace('\\', '/');
        string normalizedContentPath = templateContentPath.Replace('\\', '/').TrimEnd('/');

        if (normalizedFullPath.StartsWith(normalizedContentPath + "/", StringComparison.OrdinalIgnoreCase))
        {
            return normalizedFullPath[(normalizedContentPath.Length + 1)..];
        }

        // Fallback: just use filename
        return Path.GetFileName(fullPath);
    }

    private static void CopyDirectory(string sourceDir, string targetDir)
    {
        DirectoryInfo source = new(sourceDir);
        DirectoryInfo target = new(targetDir);

        foreach (FileInfo file in source.GetFiles())
        {
            File.SetAttributes(file.FullName, FileAttributes.Normal);
            file.CopyTo(Path.Combine(target.FullName, file.Name), overwrite: true);
        }

        foreach (DirectoryInfo subDir in source.GetDirectories())
        {
            DirectoryInfo nextTargetSubDir = target.CreateSubdirectory(subDir.Name);
            CopyDirectory(subDir.FullName, nextTargetSubDir.FullName);
        }
    }

    // Helper record for cache metadata
    private record TemplateCacheInfo
    {
        public string CommitSha { get; init; } = string.Empty;
        public DateTime CachedAt { get; init; }
    }
}
