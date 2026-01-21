using System;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

public class StudioctlInstallScriptService : IStudioctlInstallScriptService
{
    private static readonly Uri s_baseUrl = new("https://github.com/Altinn/altinn-studio/releases/latest/download/");
    private static readonly TimeSpan s_refreshInterval = TimeSpan.FromHours(1);
    private const string CacheKeyPrefix = "studioctl-install-script:";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<StudioctlInstallScriptService> _logger;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _refreshLocks = new();

    public StudioctlInstallScriptService(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        ILogger<StudioctlInstallScriptService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _logger = logger;
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
            try
            {
                var result = await FetchAndCacheAsync(scriptType, cacheKey, CancellationToken.None);
                if (result.Status != StudioctlInstallScriptStatus.Ok)
                {
                    _logger.LogWarning(
                        "Background refresh failed for {ScriptType} with status {Status}",
                        scriptType,
                        result.Status);
                }
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
        Uri url = new(s_baseUrl, fileName);

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        using HttpClient client = _httpClientFactory.CreateClient();
        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Timed out while fetching install script {Url}", url);
            return new StudioctlInstallScriptResult(
                StudioctlInstallScriptStatus.Unavailable,
                Array.Empty<byte>(),
                fileName,
                false);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Transport failure while fetching install script {Url}", url);
            return new StudioctlInstallScriptResult(
                StudioctlInstallScriptStatus.Unavailable,
                Array.Empty<byte>(),
                fileName,
                false);
        }

        using (response)
        {
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
            _cache.Set(cacheKey, entry);

            return new StudioctlInstallScriptResult(
                StudioctlInstallScriptStatus.Ok,
                content,
                fileName,
                false);
        }
    }

    internal sealed record StudioctlInstallScriptCacheEntry(byte[] Content, DateTimeOffset FetchedAt);
}
