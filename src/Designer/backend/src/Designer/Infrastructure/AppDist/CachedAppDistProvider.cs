using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Runtime.ExceptionServices;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.AppDist;
using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Infrastructure.AppDist;

/// <summary>
/// Bounds the registry traffic of an <see cref="IAppDistProvider"/> so that public callers cannot drive the
/// Designer into the upstream registry's rate limits.
/// </summary>
/// <remarks>
/// The version list is cached for <see cref="AppDistSettings.VersionListCacheDuration"/>, including a registry
/// failure, so at most one tag listing reaches the registry per interval. A layer is fetched only for versions
/// already in the local cache or present in that version list; every other version is answered as unpublished
/// without contacting the registry.
/// </remarks>
public sealed class CachedAppDistProvider(
    IAppDistProvider inner,
    IOptionsMonitor<AppDistSettings> settings,
    TimeProvider timeProvider
) : IAppDistProvider
{
    private readonly SemaphoreSlim _refreshLock = new(1, 1);
    private VersionListEntry? _versionList;

    public Task<IAppDistContent?> GetVersion(string version, CancellationToken cancellationToken = default) =>
        GetLayer(version, AppDistLayer.Content, cancellationToken);

    public async Task<IAppDistContent?> GetLayer(
        string version,
        AppDistLayer layer,
        CancellationToken cancellationToken = default
    )
    {
        if (!await IsKnownVersion(version, layer, cancellationToken))
        {
            return null;
        }

        return await inner.GetLayer(version, layer, cancellationToken);
    }

    public Task<IReadOnlyList<string>> ListVersions(CancellationToken cancellationToken = default) =>
        GetVersionList(cancellationToken);

    public Task<IReadOnlyList<string>> ListCachedVersions(
        AppDistLayer layer,
        CancellationToken cancellationToken = default
    ) => inner.ListCachedVersions(layer, cancellationToken);

    private async Task<bool> IsKnownVersion(string version, AppDistLayer layer, CancellationToken cancellationToken)
    {
        IReadOnlyList<string> cachedVersions = await inner.ListCachedVersions(layer, cancellationToken);
        if (cachedVersions.Contains(version, StringComparer.Ordinal))
        {
            return true;
        }

        IReadOnlyList<string> publishedVersions = await GetVersionList(cancellationToken);
        return publishedVersions.Contains(version, StringComparer.Ordinal);
    }

    private async Task<IReadOnlyList<string>> GetVersionList(CancellationToken cancellationToken)
    {
        if (TryGetFreshVersionList(out VersionListEntry? entry))
        {
            return entry.Unwrap();
        }

        await _refreshLock.WaitAsync(cancellationToken);
        try
        {
            if (TryGetFreshVersionList(out entry))
            {
                return entry.Unwrap();
            }

            entry = await FetchVersionList(cancellationToken);
            _versionList = entry;
            return entry.Unwrap();
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    private async Task<VersionListEntry> FetchVersionList(CancellationToken cancellationToken)
    {
        DateTimeOffset fetchedAt = timeProvider.GetUtcNow();
        try
        {
            return new VersionListEntry(await inner.ListVersions(cancellationToken), null, fetchedAt);
        }
        catch (AppDistSourceException exception)
        {
            return new VersionListEntry(null, ExceptionDispatchInfo.Capture(exception), fetchedAt);
        }
    }

    private bool TryGetFreshVersionList([NotNullWhen(true)] out VersionListEntry? entry)
    {
        entry = _versionList;
        return entry is not null
            && timeProvider.GetUtcNow() - entry.FetchedAt < settings.CurrentValue.VersionListCacheDuration;
    }

    /// <summary>
    /// One result of listing versions from the registry, whether it succeeded or failed.
    /// </summary>
    private sealed record VersionListEntry(
        IReadOnlyList<string>? Versions,
        ExceptionDispatchInfo? Failure,
        DateTimeOffset FetchedAt
    )
    {
        public IReadOnlyList<string> Unwrap()
        {
            Failure?.Throw();
            return Versions!;
        }
    }
}
