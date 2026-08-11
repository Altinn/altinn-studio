using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

public class RepositoryCleanupService : IRepositoryCleanupService
{
    private readonly ServiceRepositorySettings _repositorySettings;
    private readonly SchedulingSettings _schedulingSettings;
    private readonly TimeProvider _timeProvider;
    private readonly IRepositoryDirectoryCleaner _repositoryDirectoryCleaner;
    private readonly ILockService _lockService;
    private readonly ILogger<RepositoryCleanupService> _logger;

    public RepositoryCleanupService(
        ServiceRepositorySettings repositorySettings,
        SchedulingSettings schedulingSettings,
        TimeProvider timeProvider,
        IRepositoryDirectoryCleaner repositoryDirectoryCleaner,
        ILockService lockService,
        ILogger<RepositoryCleanupService> logger
    )
    {
        _repositorySettings = repositorySettings;
        _schedulingSettings = schedulingSettings;
        _timeProvider = timeProvider;
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
        RepositoryCleanupCandidate[] candidates = FindCandidates(cutoff, cancellationToken)
            .OrderBy(candidate => candidate.LastModified)
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
                        skipped++;
                        continue;
                    }

                    if (
                        !TryGetLatestFileModification(
                            candidate.RepositoryPath,
                            cancellationToken,
                            out DateTimeOffset latestFileModification
                        )
                    )
                    {
                        failed++;
                        continue;
                    }

                    if (latestFileModification >= cutoff)
                    {
                        skipped++;
                        continue;
                    }

                    if (await DeleteWithRetriesAsync(candidate, cancellationToken))
                    {
                        _repositoryDirectoryCleaner.TryDeleteIfEmpty(candidate.OrganizationPath);
                        _repositoryDirectoryCleaner.TryDeleteIfEmpty(candidate.DeveloperPath);
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
        CancellationToken cancellationToken
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

                    if (!IsGitRepository(repositoryPath))
                    {
                        continue;
                    }

                    if (
                        TryGetLatestFileModification(
                            repositoryPath,
                            cancellationToken,
                            out DateTimeOffset latestFileModification
                        )
                        && latestFileModification < cutoff
                    )
                    {
                        yield return new RepositoryCleanupCandidate(
                            editingContext,
                            developerPath,
                            orgPath,
                            repositoryPath,
                            latestFileModification
                        );
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

    private bool TryGetLatestFileModification(
        string repositoryPath,
        CancellationToken cancellationToken,
        out DateTimeOffset latestFileModification
    )
    {
        latestFileModification = DateTimeOffset.MinValue;
        try
        {
            var enumerationOptions = new EnumerationOptions
            {
                RecurseSubdirectories = true,
                IgnoreInaccessible = false,
                AttributesToSkip = FileAttributes.ReparsePoint,
                ReturnSpecialDirectories = false,
            };
            foreach (string filePath in Directory.EnumerateFiles(repositoryPath, "*", enumerationOptions))
            {
                cancellationToken.ThrowIfCancellationRequested();
                DateTimeOffset lastModified = File.GetLastWriteTimeUtc(filePath);
                if (lastModified > latestFileModification)
                {
                    latestFileModification = lastModified;
                }
            }
            return true;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(
                exception,
                "Failed to inspect files in local repository {RepositoryPath}.",
                repositoryPath
            );
            return false;
        }
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
        string DeveloperPath,
        string OrganizationPath,
        string RepositoryPath,
        DateTimeOffset LastModified
    );
}
