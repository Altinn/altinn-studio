using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class RepositoryCleanupCandidateProcessor
{
    private readonly RepositoryCleanupSettings _settings;
    private readonly TimeProvider _timeProvider;
    private readonly RepositoryFileTimestampScanner _timestampScanner;
    private readonly IRepositoryDirectoryCleaner _directoryCleaner;
    private readonly ILockService _lockService;
    private readonly ILogger<RepositoryCleanupCandidateProcessor> _logger;

    public RepositoryCleanupCandidateProcessor(
        SchedulingSettings schedulingSettings,
        TimeProvider timeProvider,
        RepositoryFileTimestampScanner timestampScanner,
        IRepositoryDirectoryCleaner directoryCleaner,
        ILockService lockService,
        ILogger<RepositoryCleanupCandidateProcessor> logger
    )
    {
        _settings = schedulingSettings.RepositoryCleanup;
        _timeProvider = timeProvider;
        _timestampScanner = timestampScanner;
        _directoryCleaner = directoryCleaner;
        _lockService = lockService;
        _logger = logger;
    }

    public async Task<RepositoryCleanupCandidateOutcome> ProcessAsync(
        RepositoryCleanupCandidate candidate,
        DateTimeOffset cutoff,
        CancellationToken cancellationToken
    )
    {
        try
        {
            await using (
                await _lockService.AcquireRepoUserWideLockAsync(
                    candidate.EditingContext,
                    _settings.LockTimeout,
                    cancellationToken
                )
            )
            {
                return await ProcessLockedAsync(candidate, cutoff, cancellationToken);
            }
        }
        catch (TimeoutException)
        {
            _logger.LogInformation(
                "Skipped inactive local repository {Developer}/{Org}/{Repository} because it is locked.",
                candidate.EditingContext.Developer,
                candidate.EditingContext.Org,
                candidate.EditingContext.Repo
            );
            return RepositoryCleanupCandidateOutcome.Skipped;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(
                exception,
                "Failed to process inactive local repository {Developer}/{Org}/{Repository}.",
                candidate.EditingContext.Developer,
                candidate.EditingContext.Org,
                candidate.EditingContext.Repo
            );
            return RepositoryCleanupCandidateOutcome.Failed;
        }
    }

    private async Task<RepositoryCleanupCandidateOutcome> ProcessLockedAsync(
        RepositoryCleanupCandidate candidate,
        DateTimeOffset cutoff,
        CancellationToken cancellationToken
    )
    {
        if (!Directory.Exists(candidate.RepositoryPath))
        {
            return RepositoryCleanupCandidateOutcome.Skipped;
        }

        if (
            !_timestampScanner.TryGetLatestModification(
                candidate.RepositoryPath,
                cancellationToken,
                out DateTimeOffset latestModification
            )
        )
        {
            return RepositoryCleanupCandidateOutcome.Failed;
        }

        if (latestModification >= cutoff)
        {
            return RepositoryCleanupCandidateOutcome.Skipped;
        }

        if (!await DeleteWithRetriesAsync(candidate, cancellationToken))
        {
            return RepositoryCleanupCandidateOutcome.Failed;
        }

        _directoryCleaner.TryDeleteIfEmpty(candidate.OrganizationPath);
        _directoryCleaner.TryDeleteIfEmpty(candidate.DeveloperPath);
        return RepositoryCleanupCandidateOutcome.Deleted;
    }

    private async Task<bool> DeleteWithRetriesAsync(
        RepositoryCleanupCandidate candidate,
        CancellationToken cancellationToken
    )
    {
        for (int attempt = 1; attempt <= _settings.DeletionRetryAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                _directoryCleaner.Delete(candidate.RepositoryPath);
                return true;
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                if (!Directory.Exists(candidate.RepositoryPath))
                {
                    return true;
                }

                if (attempt == _settings.DeletionRetryAttempts)
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
                    _settings.DeletionRetryAttempts
                );
                await Task.Delay(_settings.DeletionRetryDelay, _timeProvider, cancellationToken);
            }
        }

        return false;
    }
}
