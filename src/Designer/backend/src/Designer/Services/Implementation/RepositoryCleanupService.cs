using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.RepositoryActivity;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

public class RepositoryCleanupService : IRepositoryCleanupService
{
    private readonly ServiceRepositorySettings _repositorySettings;
    private readonly SchedulingSettings _schedulingSettings;
    private readonly TimeProvider _timeProvider;
    private readonly IRepositoryActivityService _repositoryActivityService;
    private readonly IRepositoryDirectoryCleaner _repositoryDirectoryCleaner;
    private readonly ILockService _lockService;
    private readonly ILogger<RepositoryCleanupService> _logger;

    public RepositoryCleanupService(
        ServiceRepositorySettings repositorySettings,
        SchedulingSettings schedulingSettings,
        TimeProvider timeProvider,
        IRepositoryActivityService repositoryActivityService,
        IRepositoryDirectoryCleaner repositoryDirectoryCleaner,
        ILockService lockService,
        ILogger<RepositoryCleanupService> logger
    )
    {
        _repositorySettings = repositorySettings;
        _schedulingSettings = schedulingSettings;
        _timeProvider = timeProvider;
        _repositoryActivityService = repositoryActivityService;
        _repositoryDirectoryCleaner = repositoryDirectoryCleaner;
        _lockService = lockService;
        _logger = logger;
    }

    public async Task<RepositoryCleanupResult> DeleteInactiveRepositoriesAsync(
        CancellationToken cancellationToken = default
    )
    {
        RepositoryCleanupSettings settings = _schedulingSettings.RepositoryCleanup;
        DateTimeOffset cutoff = _timeProvider.GetUtcNow() - settings.RetentionPeriod;
        IReadOnlyCollection<RepositoryActivityEntity> repositoryActivities =
            await _repositoryActivityService.GetAllAsync(cancellationToken);
        IReadOnlyDictionary<AltinnRepoEditingContext, RepositoryActivityEntity> activityByRepository =
            repositoryActivities.ToDictionary(activity => activity.EditingContext);
        RepositoryCleanupCandidate[] candidates = FindCandidates(cutoff, activityByRepository)
            .OrderBy(candidate => candidate.LastActivity)
            .Take(settings.MaxRepositoriesPerRun)
            .ToArray();

        int deleted = 0;
        int failed = 0;
        int skipped = 0;

        foreach (RepositoryCleanupCandidate candidate in candidates)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                await using (
                    await _lockService.AcquireRepoUserWideLockAsync(
                        candidate.EditingContext,
                        settings.LockTimeout,
                        cancellationToken
                    )
                )
                {
                    if (!Directory.Exists(candidate.RepositoryPath))
                    {
                        await _repositoryActivityService.RemoveAsync(candidate.EditingContext, cancellationToken);
                        skipped++;
                        continue;
                    }

                    RepositoryActivityEntity? refreshedActivity = await _repositoryActivityService.GetAsync(
                        candidate.EditingContext,
                        cancellationToken
                    );
                    DateTimeOffset refreshedLastActivity =
                        refreshedActivity?.LastAccessedAt ?? Directory.GetLastWriteTimeUtc(candidate.RepositoryPath);
                    if (refreshedLastActivity >= cutoff)
                    {
                        skipped++;
                        continue;
                    }

                    bool cleanupPending = await _repositoryActivityService.TryMarkCleanupPendingAsync(
                        candidate.EditingContext,
                        refreshedLastActivity,
                        cancellationToken
                    );
                    if (!cleanupPending)
                    {
                        skipped++;
                        continue;
                    }

                    if (await DeleteWithRetriesAsync(candidate, cancellationToken))
                    {
                        await _repositoryActivityService.RemoveAsync(candidate.EditingContext, cancellationToken);
                        deleted++;
                    }
                    else
                    {
                        failed++;
                    }
                }
            }
            catch (TimeoutException)
            {
                skipped++;
                _logger.LogInformation(
                    "Skipped inactive local repository {Developer}/{Org}/{Repository} because it is locked.",
                    candidate.EditingContext.Developer,
                    candidate.EditingContext.Org,
                    candidate.EditingContext.Repo
                );
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                failed++;
                _logger.LogWarning(
                    exception,
                    "Failed to inspect inactive local repository {Developer}/{Org}/{Repository}.",
                    candidate.EditingContext.Developer,
                    candidate.EditingContext.Org,
                    candidate.EditingContext.Repo
                );
            }
        }

        return new RepositoryCleanupResult(candidates.Length, deleted, failed, skipped);
    }

    private IEnumerable<RepositoryCleanupCandidate> FindCandidates(
        DateTimeOffset cutoff,
        IReadOnlyDictionary<AltinnRepoEditingContext, RepositoryActivityEntity> activityByRepository
    )
    {
        foreach (string developerPath in GetDirectories(_repositorySettings.RepositoryLocation))
        {
            foreach (string orgPath in GetDirectories(developerPath))
            {
                foreach (string repositoryPath in GetDirectories(orgPath))
                {
                    AltinnRepoEditingContext? editingContext = TryCreateEditingContext(
                        developerPath,
                        orgPath,
                        repositoryPath
                    );
                    if (editingContext is null)
                    {
                        continue;
                    }

                    activityByRepository.TryGetValue(editingContext, out RepositoryActivityEntity? activity);
                    if (!IsGitRepository(repositoryPath) && activity?.CleanupPending != true)
                    {
                        continue;
                    }

                    DateTimeOffset lastActivity =
                        activity?.LastAccessedAt ?? Directory.GetLastWriteTimeUtc(repositoryPath);

                    if (lastActivity < cutoff)
                    {
                        yield return new RepositoryCleanupCandidate(editingContext, repositoryPath, lastActivity);
                    }
                }
            }
        }
    }

    private string[] GetDirectories(string path)
    {
        try
        {
            return Directory.Exists(path) ? Directory.GetDirectories(path) : [];
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(exception, "Failed to enumerate local repository directory {DirectoryPath}.", path);
            return [];
        }
    }

    private static bool IsGitRepository(string repositoryPath)
    {
        string gitPath = Path.Combine(repositoryPath, ".git");
        return Directory.Exists(gitPath) || File.Exists(gitPath);
    }

    private AltinnRepoEditingContext? TryCreateEditingContext(
        string developerPath,
        string orgPath,
        string repositoryPath
    )
    {
        try
        {
            return AltinnRepoEditingContext.FromOrgRepoDeveloper(
                Path.GetFileName(orgPath),
                Path.GetFileName(repositoryPath),
                Path.GetFileName(developerPath)
            );
        }
        catch (ArgumentException exception)
        {
            _logger.LogWarning(
                exception,
                "Skipping local repository with an invalid path: {RepositoryPath}.",
                repositoryPath
            );
            return null;
        }
    }

    private async Task<bool> DeleteWithRetriesAsync(
        RepositoryCleanupCandidate candidate,
        CancellationToken cancellationToken
    )
    {
        RepositoryCleanupSettings settings = _schedulingSettings.RepositoryCleanup;

        for (int attempt = 1; attempt <= settings.DeletionRetryAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                _repositoryDirectoryCleaner.Delete(candidate.RepositoryPath);
                return true;
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                if (!Directory.Exists(candidate.RepositoryPath))
                {
                    return true;
                }

                if (attempt == settings.DeletionRetryAttempts)
                {
                    _logger.LogWarning(
                        exception,
                        "Failed to delete inactive local repository {Developer}/{Org}/{Repository} after {AttemptCount} attempts.",
                        candidate.EditingContext.Developer,
                        candidate.EditingContext.Org,
                        candidate.EditingContext.Repo,
                        attempt
                    );
                    return false;
                }

                _logger.LogInformation(
                    exception,
                    "Retrying deletion of inactive local repository {Developer}/{Org}/{Repository}. Attempt {Attempt}/{AttemptCount}.",
                    candidate.EditingContext.Developer,
                    candidate.EditingContext.Org,
                    candidate.EditingContext.Repo,
                    attempt,
                    settings.DeletionRetryAttempts
                );
                await Task.Delay(settings.DeletionRetryDelay, _timeProvider, cancellationToken);
            }
        }

        return false;
    }

    private sealed record RepositoryCleanupCandidate(
        AltinnRepoEditingContext EditingContext,
        string RepositoryPath,
        DateTimeOffset LastActivity
    );
}
