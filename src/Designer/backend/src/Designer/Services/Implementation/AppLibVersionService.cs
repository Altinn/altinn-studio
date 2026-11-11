using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Asks each running app for its application metadata, a few apps at a time. An app reports the version of the
/// libraries it was built with, which changes only with a deploy, and a deploy changes the image tag, so a version is
/// kept for as long as the app runs the same image.
/// </summary>
public sealed class AppLibVersionService(IAppResourcesService appResourcesService, IMemoryCache cache)
    : IAppLibVersionService
{
    private const int MaxConcurrentAppMetadataRequests = 4;
    private static readonly TimeSpan s_cacheDuration = TimeSpan.FromHours(12);

    /// <inheritdoc />
    public async Task<IReadOnlyDictionary<string, string?>> GetAppLibVersions(
        string org,
        string environment,
        IEnumerable<AppImage> apps,
        CancellationToken cancellationToken
    )
    {
        using var throttler = new SemaphoreSlim(MaxConcurrentAppMetadataRequests);
        var lookups = apps.Select(async app =>
            (app.App, Version: await GetAppLibVersion(org, environment, app, throttler, cancellationToken))
        );

        var results = await Task.WhenAll(lookups);
        return results
            .DistinctBy(result => result.App, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(result => result.App, result => result.Version, StringComparer.OrdinalIgnoreCase);
    }

    private async Task<string?> GetAppLibVersion(
        string org,
        string environment,
        AppImage app,
        SemaphoreSlim throttler,
        CancellationToken cancellationToken
    )
    {
        string? cacheKey = app.ImageTag is null
            ? null
            : $"app-lib-version:{org}:{environment}:{app.App}:{app.ImageTag}";
        if (cacheKey is not null && cache.TryGetValue(cacheKey, out string? cachedVersion))
        {
            return cachedVersion;
        }

        await throttler.WaitAsync(cancellationToken);
        try
        {
            var applicationMetadata = await appResourcesService.GetApplicationMetadata(
                org,
                environment,
                app.App,
                cancellationToken
            );
            string? version = ParseAppLibVersion(applicationMetadata.AltinnNugetVersion);
            if (cacheKey is not null && version is not null)
            {
                cache.Set(cacheKey, version, s_cacheDuration);
            }

            return version;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // An app that does not answer, such as one that is down, has no version to show, and the others still do.
            return null;
        }
        finally
        {
            throttler.Release();
        }
    }

    private static string? ParseAppLibVersion(string? altinnNugetVersion)
    {
        if (string.IsNullOrEmpty(altinnNugetVersion))
        {
            return null;
        }
        return Version.TryParse(altinnNugetVersion, out var version) ? version.ToString(3) : null;
    }
}
