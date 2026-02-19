using System;
using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

public class StudioctlInstallScriptService : IStudioctlInstallScriptService
{
    private static readonly Uri s_releaseApiUrl = new("https://api.github.com/repos/Altinn/altinn-studio/releases");
    private static readonly Uri s_downloadBaseUrl = new("https://github.com/Altinn/altinn-studio/releases/download/");
    private static readonly TimeSpan s_refreshInterval = TimeSpan.FromHours(1);
    // Keep stale fallback available for a day while ensuring cache entries eventually expire.
    private static readonly TimeSpan s_cacheEntryLifetime = TimeSpan.FromHours(24);
    private const string CacheKeyPrefix = "studioctl-install-script:";
    private const string StudioctlTagPrefix = "studioctl/v";
    private const int MaxScriptBytes = 8 * 1024 * 1024;
    private const int MaxReleaseMetadataBytes = 1024 * 1024;
    private const int ReleaseLookupPageSize = 100;
    private const int ReleaseLookupMaxPages = 10;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<StudioctlInstallScriptService> _logger;
    private readonly IHostApplicationLifetime? _hostLifetime;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _refreshLocks = new();

    public StudioctlInstallScriptService(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        ILogger<StudioctlInstallScriptService> logger,
        IHostApplicationLifetime? hostLifetime = null)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _logger = logger;
        _hostLifetime = hostLifetime;
    }

    public async Task<StudioctlInstallScriptResult> GetInstallScriptAsync(
        StudioctlInstallScriptType scriptType,
        CancellationToken cancellationToken)
    {
        string cacheKey = GetCacheKey(scriptType);
        if (_cache.TryGetValue(cacheKey, out StudioctlInstallScriptCacheEntry? entry) && entry is not null)
        {
            bool isStale = IsStale(entry);
            if (isStale)
            {
                TriggerRefresh(scriptType, cacheKey);
            }

            return new StudioctlInstallScriptResult(
                StudioctlInstallScriptStatus.Ok,
                entry.Content,
                GetFileName(scriptType),
                isStale);
        }

        return await FetchWithLockAsync(scriptType, cacheKey, cancellationToken);
    }

    private static string GetFileName(StudioctlInstallScriptType scriptType)
        => scriptType switch
        {
            StudioctlInstallScriptType.Bash => "install.sh",
            StudioctlInstallScriptType.PowerShell => "install.ps1",
            _ => throw new ArgumentOutOfRangeException(nameof(scriptType), scriptType, "Unsupported script type")
        };

    private static string GetCacheKey(StudioctlInstallScriptType scriptType)
        => CacheKeyPrefix + scriptType;

    private static bool IsStale(StudioctlInstallScriptCacheEntry entry)
        => DateTimeOffset.UtcNow - entry.FetchedAt > s_refreshInterval;

    private void TriggerRefresh(StudioctlInstallScriptType scriptType, string cacheKey)
    {
        SemaphoreSlim refreshLock = _refreshLocks.GetOrAdd(cacheKey, _ => new SemaphoreSlim(1, 1));
        if (!refreshLock.Wait(0))
        {
            return;
        }

        _ = Task.Run(async () =>
        {
            var cancellationToken = _hostLifetime?.ApplicationStopping ?? CancellationToken.None;
            try
            {
                var result = await FetchAndCacheAsync(scriptType, cacheKey, cancellationToken);
                if (result.Status != StudioctlInstallScriptStatus.Ok)
                {
                    _logger.LogWarning(
                        "Background refresh failed for {ScriptType} with status {Status}",
                        scriptType,
                        result.Status);
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                _logger.LogDebug("Background refresh canceled for {ScriptType}", scriptType);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Background refresh failed for {ScriptType}", scriptType);
            }
            finally
            {
                refreshLock.Release();
            }
        });
    }

    private async Task<StudioctlInstallScriptResult> FetchWithLockAsync(
        StudioctlInstallScriptType scriptType,
        string cacheKey,
        CancellationToken cancellationToken)
    {
        SemaphoreSlim refreshLock = _refreshLocks.GetOrAdd(cacheKey, _ => new SemaphoreSlim(1, 1));
        bool scheduleRefresh = false;
        StudioctlInstallScriptResult result;

        await refreshLock.WaitAsync(cancellationToken);
        try
        {
            if (_cache.TryGetValue(cacheKey, out StudioctlInstallScriptCacheEntry? entry) && entry is not null)
            {
                bool isStale = IsStale(entry);
                scheduleRefresh = isStale;
                result = new StudioctlInstallScriptResult(
                    StudioctlInstallScriptStatus.Ok,
                    entry.Content,
                    GetFileName(scriptType),
                    isStale);
            }
            else
            {
                result = await FetchAndCacheAsync(scriptType, cacheKey, cancellationToken);
            }
        }
        finally
        {
            refreshLock.Release();
        }

        if (scheduleRefresh)
        {
            TriggerRefresh(scriptType, cacheKey);
        }

        return result;
    }

    private async Task<StudioctlInstallScriptResult> FetchAndCacheAsync(
        StudioctlInstallScriptType scriptType,
        string cacheKey,
        CancellationToken cancellationToken)
    {
        string fileName = GetFileName(scriptType);
        using HttpClient client = _httpClientFactory.CreateClient();
        ReleaseLookupResult releaseLookup =
            await ResolveLatestStudioctlReleaseAsync(client, cancellationToken);
        if (releaseLookup.Status != StudioctlInstallScriptStatus.Ok || releaseLookup.TagName is null)
        {
            return new StudioctlInstallScriptResult(
                releaseLookup.Status,
                Array.Empty<byte>(),
                fileName,
                false);
        }

        Uri url = new(s_downloadBaseUrl, $"{releaseLookup.TagName}/{fileName}");

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        using HttpResponseMessage? response = await SendAsync(
            client,
            request,
            cancellationToken,
            url,
            "fetching install script");
        if (response is null)
        {
            return new StudioctlInstallScriptResult(
                StudioctlInstallScriptStatus.Unavailable,
                Array.Empty<byte>(),
                fileName,
                false);
        }

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            _logger.LogInformation("Install script not found upstream: {Url}", url);
            return new StudioctlInstallScriptResult(
                StudioctlInstallScriptStatus.NotFound,
                Array.Empty<byte>(),
                fileName,
                false);
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Failed to fetch install script {Url}. Status: {Status}",
                url,
                response.StatusCode);
            return new StudioctlInstallScriptResult(
                StudioctlInstallScriptStatus.Unavailable,
                Array.Empty<byte>(),
                fileName,
                false);
        }

        try
        {
            await response.Content.LoadIntoBufferAsync(MaxScriptBytes, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(
                ex,
                "Install script response exceeded size limit of {MaxBytes} bytes: {Url}",
                MaxScriptBytes,
                url);
            return new StudioctlInstallScriptResult(
                StudioctlInstallScriptStatus.Unavailable,
                Array.Empty<byte>(),
                fileName,
                false);
        }

        byte[] content = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        if (content.Length == 0)
        {
            _logger.LogWarning("Install script response was empty: {Url}", url);
            return new StudioctlInstallScriptResult(
                StudioctlInstallScriptStatus.Unavailable,
                Array.Empty<byte>(),
                fileName,
                false);
        }

        var entry = new StudioctlInstallScriptCacheEntry(content, DateTimeOffset.UtcNow);
        _cache.Set(
            cacheKey,
            entry,
            new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = s_cacheEntryLifetime
            });

        return new StudioctlInstallScriptResult(
            StudioctlInstallScriptStatus.Ok,
            content,
            fileName,
            false);
    }

    private async Task<ReleaseLookupResult> ResolveLatestStudioctlReleaseAsync(
        HttpClient client,
        CancellationToken cancellationToken)
    {
        for (int page = 1; page <= ReleaseLookupMaxPages; page++)
        {
            Uri releasesUrl = new(
                $"{s_releaseApiUrl}?per_page={ReleaseLookupPageSize}&page={page}");

            using var request = new HttpRequestMessage(HttpMethod.Get, releasesUrl);
            request.Headers.Accept.ParseAdd("application/vnd.github+json");
            request.Headers.UserAgent.ParseAdd("altinn-studio-designer");

            using HttpResponseMessage? response = await SendAsync(
                client,
                request,
                cancellationToken,
                releasesUrl,
                "resolving latest studioctl release from");
            if (response is null)
            {
                return new ReleaseLookupResult(StudioctlInstallScriptStatus.Unavailable, null);
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Failed to resolve latest studioctl release from {Url}. Status: {Status}",
                    releasesUrl,
                    response.StatusCode);
                return new ReleaseLookupResult(StudioctlInstallScriptStatus.Unavailable, null);
            }

            try
            {
                await response.Content.LoadIntoBufferAsync(MaxReleaseMetadataBytes, cancellationToken);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Release metadata exceeded size limit of {MaxBytes} bytes: {Url}",
                    MaxReleaseMetadataBytes,
                    releasesUrl);
                return new ReleaseLookupResult(StudioctlInstallScriptStatus.Unavailable, null);
            }

            GitHubRelease[]? releases;
            try
            {
                releases = await response.Content.ReadFromJsonAsync<GitHubRelease[]>(cancellationToken);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid release metadata payload from {Url}", releasesUrl);
                return new ReleaseLookupResult(StudioctlInstallScriptStatus.Unavailable, null);
            }

            if (releases is null)
            {
                _logger.LogWarning("Unexpected release metadata shape from {Url}", releasesUrl);
                return new ReleaseLookupResult(StudioctlInstallScriptStatus.Unavailable, null);
            }

            int releaseCount = 0;
            foreach (GitHubRelease release in releases)
            {
                releaseCount++;
                if (release.Draft || release.Prerelease)
                {
                    continue;
                }

                if (IsStableStudioctlReleaseTag(release.TagName))
                {
                    return new ReleaseLookupResult(StudioctlInstallScriptStatus.Ok, release.TagName);
                }
            }

            if (releaseCount < ReleaseLookupPageSize)
            {
                break;
            }
        }

        _logger.LogInformation("No stable studioctl release tag was found upstream");
        return new ReleaseLookupResult(StudioctlInstallScriptStatus.NotFound, null);
    }

    private async Task<HttpResponseMessage?> SendAsync(
        HttpClient client,
        HttpRequestMessage request,
        CancellationToken cancellationToken,
        Uri url,
        string operation)
    {
        try
        {
            return await client.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Timed out while {Operation} {Url}", operation, url);
            return null;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Transport failure while {Operation} {Url}", operation, url);
            return null;
        }
    }

    private static bool IsStableStudioctlReleaseTag(string? tagName)
    {
        if (string.IsNullOrWhiteSpace(tagName))
        {
            return false;
        }

        ReadOnlySpan<char> tag = tagName.AsSpan();
        ReadOnlySpan<char> prefix = StudioctlTagPrefix.AsSpan();
        if (!tag.StartsWith(prefix, StringComparison.Ordinal))
        {
            return false;
        }

        ReadOnlySpan<char> version = tag[prefix.Length..];
        int firstDot = version.IndexOf('.');
        if (firstDot <= 0)
        {
            return false;
        }

        ReadOnlySpan<char> major = version[..firstDot];
        ReadOnlySpan<char> afterFirstDot = version[(firstDot + 1)..];
        int secondDot = afterFirstDot.IndexOf('.');
        if (secondDot <= 0)
        {
            return false;
        }

        ReadOnlySpan<char> minor = afterFirstDot[..secondDot];
        ReadOnlySpan<char> patch = afterFirstDot[(secondDot + 1)..];
        if (patch.Length == 0 || patch.IndexOf('.') >= 0)
        {
            return false;
        }

        return IsValidVersionNumber(major)
            && IsValidVersionNumber(minor)
            && IsValidVersionNumber(patch);
    }

    private static bool IsValidVersionNumber(ReadOnlySpan<char> value)
        => int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out _);

    private sealed record class GitHubRelease
    {
        [JsonPropertyName("tag_name")]
        public string? TagName { get; init; }

        [JsonPropertyName("draft")]
        public bool Draft { get; init; }

        [JsonPropertyName("prerelease")]
        public bool Prerelease { get; init; }
    }

    private readonly record struct ReleaseLookupResult(StudioctlInstallScriptStatus Status, string? TagName);

    internal sealed record StudioctlInstallScriptCacheEntry(byte[] Content, DateTimeOffset FetchedAt);
}
