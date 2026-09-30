using System;
using System.IO;
using System.Threading;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class RepositoryFileTimestampScanner
{
    private readonly ILogger<RepositoryFileTimestampScanner> _logger;

    public RepositoryFileTimestampScanner(ILogger<RepositoryFileTimestampScanner> logger)
    {
        _logger = logger;
    }

    public bool TryGetLatestModification(
        string repositoryPath,
        CancellationToken cancellationToken,
        out DateTimeOffset latestModification
    )
    {
        latestModification = DateTimeOffset.MinValue;
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
                if (lastModified > latestModification)
                {
                    latestModification = lastModified;
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
}
