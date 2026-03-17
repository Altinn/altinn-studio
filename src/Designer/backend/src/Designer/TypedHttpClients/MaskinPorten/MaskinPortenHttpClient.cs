using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;

public class MaskinPortenHttpClient : IMaskinPortenHttpClient
{
    internal const string HttpClientName = "MaskinPortenHttpClient";
    internal const string PublicHttpClientName = "MaskinPortenPublicHttpClient";
    private const string ApprovedAccessState = "APPROVED";
    private const string AccessibleForAllScopesPath =
        "/api/v1/scopes/all?accessible_for_all=true&integration_type=maskinporten&inactive=false";
    private const string AccessScopesPath = "/api/v1/scopes/access/all?integration_type=maskinporten&inactive=false";
    private static readonly TimeSpan s_accessibleForAllCacheDuration = TimeSpan.FromHours(1);

    // Refresh before expiry so users get cached data while revalidation happens in the background.
    private static readonly TimeSpan s_accessibleForAllRefreshWindow = TimeSpan.FromMinutes(10);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MaskinPortenHttpClient> _logger;
    private readonly SemaphoreSlim _accessibleForAllRefreshLock = new(1, 1);
    private AccessibleForAllScopesCacheEntry? _accessibleForAllScopesCacheEntry;
    private int _backgroundRefreshInProgress;

    public MaskinPortenHttpClient(IHttpClientFactory httpClientFactory, ILogger<MaskinPortenHttpClient> logger)
    {
        _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Fetches available MaskinPorten scopes from both public (/api/v1/scopes/all) and access (/api/v1/scopes/access/all) endpoints.
    /// When the same scope exists in both endpoints, the one from /api/v1/scopes/all takes precedence because it has descriptions.
    /// </summary>
    public async Task<IEnumerable<MaskinPortenScope>> GetAvailableScopes(CancellationToken cancellationToken = default)
    {
        using HttpClient client = _httpClientFactory.CreateClient(HttpClientName);
        Task<MaskinPortenScope[]> allScopesTask = GetAccessibleForAllScopes(cancellationToken);
        Task<HttpResponseMessage> accessScopesTask = client.GetAsync(AccessScopesPath, cancellationToken);

        await Task.WhenAll(allScopesTask, accessScopesTask);

        var allScopes = await allScopesTask;
        using HttpResponseMessage accessScopesResponse = await accessScopesTask;
        accessScopesResponse.EnsureSuccessStatusCode();
        var accessScopeResponses =
            await accessScopesResponse.Content.ReadFromJsonAsync<MaskinPortenAccessScopeResponse?[]>(cancellationToken)
            ?? [];
        var accessScopes = accessScopeResponses
            .Select(MapAccessScope)
            .Where(s => s is not null)
            .Select(s => s!)
            .ToArray();

        return FilterAndDedupe(allScopes, accessScopes);
    }

    private async Task<MaskinPortenScope[]> GetAccessibleForAllScopes(CancellationToken cancellationToken)
    {
        var cacheEntry = _accessibleForAllScopesCacheEntry;
        var now = DateTimeOffset.UtcNow;

        if (cacheEntry is not null && cacheEntry.ExpiresAtUtc > now)
        {
            if (cacheEntry.ExpiresAtUtc - now <= s_accessibleForAllRefreshWindow)
            {
                TriggerBackgroundRefreshIfNeeded();
            }

            return cacheEntry.Scopes;
        }

        await _accessibleForAllRefreshLock.WaitAsync(cancellationToken);
        try
        {
            cacheEntry = _accessibleForAllScopesCacheEntry;
            now = DateTimeOffset.UtcNow;

            if (cacheEntry is not null && cacheEntry.ExpiresAtUtc > now)
            {
                if (cacheEntry.ExpiresAtUtc - now <= s_accessibleForAllRefreshWindow)
                {
                    TriggerBackgroundRefreshIfNeeded();
                }

                return cacheEntry.Scopes;
            }

            var scopes = await FetchAccessibleForAllScopes(cancellationToken);
            _accessibleForAllScopesCacheEntry = new AccessibleForAllScopesCacheEntry(
                scopes,
                DateTimeOffset.UtcNow.Add(s_accessibleForAllCacheDuration)
            );

            return scopes;
        }
        finally
        {
            _accessibleForAllRefreshLock.Release();
        }
    }

    private void TriggerBackgroundRefreshIfNeeded()
    {
        if (Interlocked.CompareExchange(ref _backgroundRefreshInProgress, 1, 0) != 0)
        {
            return;
        }

        _ = Task.Run(RefreshAccessibleForAllScopesInBackground);
    }

    private async Task RefreshAccessibleForAllScopesInBackground()
    {
        try
        {
            await _accessibleForAllRefreshLock.WaitAsync();
            try
            {
                var cacheEntry = _accessibleForAllScopesCacheEntry;
                var now = DateTimeOffset.UtcNow;
                if (cacheEntry is not null && cacheEntry.ExpiresAtUtc - now > s_accessibleForAllRefreshWindow)
                {
                    return;
                }

                var scopes = await FetchAccessibleForAllScopes(CancellationToken.None);
                _accessibleForAllScopesCacheEntry = new AccessibleForAllScopesCacheEntry(
                    scopes,
                    DateTimeOffset.UtcNow.Add(s_accessibleForAllCacheDuration)
                );
            }
            finally
            {
                _accessibleForAllRefreshLock.Release();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Background refresh for accessible_for_all Maskinporten scopes failed. Using existing cache value."
            );
        }
        finally
        {
            Interlocked.Exchange(ref _backgroundRefreshInProgress, 0);
        }
    }

    private async Task<MaskinPortenScope[]> FetchAccessibleForAllScopes(CancellationToken cancellationToken)
    {
        using HttpClient client = _httpClientFactory.CreateClient(PublicHttpClientName);
        using HttpResponseMessage response = await client.GetAsync(AccessibleForAllScopesPath, cancellationToken);
        response.EnsureSuccessStatusCode();
        var allScopeResponses =
            await response.Content.ReadFromJsonAsync<MaskinPortenAllScopeResponse?[]>(cancellationToken) ?? [];

        return allScopeResponses
            .Where(HasMaskinportenIntegrationType)
            .Select(MapAllScope)
            .Where(s => s is not null)
            .Select(s => s!)
            .ToArray();
    }

    private IEnumerable<MaskinPortenScope> FilterAndDedupe(
        MaskinPortenScope[] allScopes,
        MaskinPortenScope[] accessScopes
    )
    {
        MaskinPortenScope[] combined = [.. allScopes, .. accessScopes];
        combined = combined.Where(s => !string.IsNullOrWhiteSpace(s.Scope)).ToArray();

        var grouped = combined.GroupBy(s => s.Scope).ToArray();

        var duplicates = grouped.Where(g => g.Count() > 1).ToArray();
        if (duplicates.Any())
        {
            _logger.LogDebug(
                "Found {Count} duplicate scopes. First occurrence wins. Examples: {Scopes}",
                duplicates.Length,
                string.Join(", ", duplicates.Take(3).Select(g => g.Key))
            );
        }

        return grouped.Select(g => g.First()).ToArray();
    }

    private static bool HasMaskinportenIntegrationType(MaskinPortenAllScopeResponse? scope) =>
        scope is not null
        && scope.AllowedIntegrationTypes?.Contains("maskinporten", StringComparer.OrdinalIgnoreCase) == true;

    private static MaskinPortenScope? MapAllScope(MaskinPortenAllScopeResponse? scope)
    {
        if (scope is null || string.IsNullOrWhiteSpace(scope.Name))
        {
            return null;
        }

        return new MaskinPortenScope { Scope = scope.Name, Description = scope.Description ?? scope.Name };
    }

    private static MaskinPortenScope? MapAccessScope(MaskinPortenAccessScopeResponse? scope)
    {
        if (
            scope is null
            || !ApprovedAccessState.Equals(scope.State, StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(scope.Scope)
        )
        {
            return null;
        }

        return new MaskinPortenScope { Scope = scope.Scope, Description = scope.Scope };
    }

    private sealed record AccessibleForAllScopesCacheEntry(MaskinPortenScope[] Scopes, DateTimeOffset ExpiresAtUtc);
}
