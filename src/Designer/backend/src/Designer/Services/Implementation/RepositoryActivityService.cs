using System;
using System.IO;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

public class RepositoryActivityService : IRepositoryActivityService
{
    private const string MetadataDirectoryName = ".altinn-studio";
    private const string ActivityDirectoryName = "repository-activity";

    private readonly ServiceRepositorySettings _repositorySettings;
    private readonly SchedulingSettings _schedulingSettings;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<RepositoryActivityService> _logger;

    public RepositoryActivityService(
        ServiceRepositorySettings repositorySettings,
        SchedulingSettings schedulingSettings,
        TimeProvider timeProvider,
        ILogger<RepositoryActivityService> logger
    )
    {
        _repositorySettings = repositorySettings;
        _schedulingSettings = schedulingSettings;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public void MarkActive(AltinnRepoEditingContext editingContext, string repositoryPath)
    {
        if (!_schedulingSettings.RepositoryCleanup.Enabled || !Directory.Exists(repositoryPath))
        {
            return;
        }

        string markerPath = GetMarkerPath(editingContext);
        DateTimeOffset now = _timeProvider.GetUtcNow();

        try
        {
            if (File.Exists(markerPath))
            {
                DateTimeOffset lastActivity = File.GetLastWriteTimeUtc(markerPath);
                if (now - lastActivity < _schedulingSettings.RepositoryCleanup.ActivityUpdateInterval)
                {
                    return;
                }
            }

            Directory.CreateDirectory(Path.GetDirectoryName(markerPath)!);
            using (File.Open(markerPath, FileMode.OpenOrCreate, FileAccess.Write, FileShare.ReadWrite)) { }
            File.SetLastWriteTimeUtc(markerPath, now.UtcDateTime);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(
                exception,
                "Failed to update local repository activity marker for {Developer}/{Org}/{Repository}.",
                editingContext.Developer,
                editingContext.Org,
                editingContext.Repo
            );
        }
    }

    public DateTimeOffset GetLastActivity(AltinnRepoEditingContext editingContext, string repositoryPath)
    {
        string markerPath = GetMarkerPath(editingContext);
        return File.Exists(markerPath)
            ? File.GetLastWriteTimeUtc(markerPath)
            : Directory.GetLastWriteTimeUtc(repositoryPath);
    }

    public bool HasMarker(AltinnRepoEditingContext editingContext) => File.Exists(GetMarkerPath(editingContext));

    public void EnsureMarker(AltinnRepoEditingContext editingContext, DateTimeOffset lastActivity)
    {
        string markerPath = GetMarkerPath(editingContext);
        if (File.Exists(markerPath))
        {
            return;
        }

        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(markerPath)!);
            using (File.Open(markerPath, FileMode.CreateNew, FileAccess.Write, FileShare.ReadWrite)) { }
            File.SetLastWriteTimeUtc(markerPath, lastActivity.UtcDateTime);
        }
        catch (IOException) when (File.Exists(markerPath))
        {
            // Another process created the marker concurrently.
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(
                exception,
                "Failed to preserve local repository activity marker for {Developer}/{Org}/{Repository}.",
                editingContext.Developer,
                editingContext.Org,
                editingContext.Repo
            );
        }
    }

    public void RemoveMarker(AltinnRepoEditingContext editingContext)
    {
        string markerPath = GetMarkerPath(editingContext);
        try
        {
            File.Delete(markerPath);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(
                exception,
                "Failed to delete local repository activity marker for {Developer}/{Org}/{Repository}.",
                editingContext.Developer,
                editingContext.Org,
                editingContext.Repo
            );
        }
    }

    private string GetMarkerPath(AltinnRepoEditingContext editingContext)
    {
        return Path.Combine(
            _repositorySettings.RepositoryLocation,
            MetadataDirectoryName,
            ActivityDirectoryName,
            editingContext.Developer,
            editingContext.Org,
            editingContext.Repo
        );
    }
}
