using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class RepositoryCleanupCandidateSource
{
    private readonly string _repositoryRoot;
    private readonly RepositoryFileTimestampScanner _timestampScanner;
    private readonly ILogger<RepositoryCleanupCandidateSource> _logger;

    public RepositoryCleanupCandidateSource(
        ServiceRepositorySettings repositorySettings,
        RepositoryFileTimestampScanner timestampScanner,
        ILogger<RepositoryCleanupCandidateSource> logger
    )
    {
        _repositoryRoot = repositorySettings.RepositoryLocation;
        _timestampScanner = timestampScanner;
        _logger = logger;
    }

    public IEnumerable<RepositoryCleanupCandidate> FindInactiveRepositories(
        DateTimeOffset cutoff,
        CancellationToken cancellationToken
    )
    {
        foreach (string developerPath in GetDirectories(_repositoryRoot))
        {
            foreach (string organizationPath in GetDirectories(developerPath))
            {
                foreach (string repositoryPath in GetDirectories(organizationPath))
                {
                    AltinnRepoEditingContext? editingContext = TryCreateEditingContext(
                        developerPath,
                        organizationPath,
                        repositoryPath
                    );
                    if (
                        editingContext is not null
                        && IsGitRepository(repositoryPath)
                        && IsInactive(repositoryPath, cutoff, cancellationToken)
                    )
                    {
                        yield return new RepositoryCleanupCandidate(
                            editingContext,
                            developerPath,
                            organizationPath,
                            repositoryPath
                        );
                    }
                }
            }
        }
    }

    private bool IsInactive(string repositoryPath, DateTimeOffset cutoff, CancellationToken cancellationToken) =>
        _timestampScanner.TryGetLatestModification(
            repositoryPath,
            cancellationToken,
            out DateTimeOffset latestModification
        )
        && latestModification < cutoff;

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
        string organizationPath,
        string repositoryPath
    )
    {
        try
        {
            return AltinnRepoEditingContext.FromOrgRepoDeveloper(
                Path.GetFileName(organizationPath),
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
}
