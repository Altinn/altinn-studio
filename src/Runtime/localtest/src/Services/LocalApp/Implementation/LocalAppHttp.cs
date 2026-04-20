#nullable enable

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Caching.Memory;

using Altinn.Studio.AppTunnel;
using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.TestData;
using LocalTest.Helpers;
using LocalTest.Tunnel;

namespace LocalTest.Services.LocalApp.Implementation
{
    public class LocalAppHttp : ILocalApp
    {
        public static readonly JsonSerializerOptions JSON_OPTIONS = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
            AllowTrailingCommas = true,
            ReadCommentHandling = JsonCommentHandling.Skip,
            PropertyNameCaseInsensitive = false,
        };
        public const string XACML_CACHE_KEY = "/api/v1/meta/authorizationpolicy/";
        public const string APPLICATION_METADATA_CACHE_KEY = "/api/v1/applicationmetadata?checkOrgApp=false";
        public const string TEXT_RESOURCE_CACE_KEY = "/api/v1/texts";
        public const string TEST_DATA_CACHE_KEY = "TEST_DATA_CACHE_KEY";
        private static readonly TimeSpan ApplicationMetadataRequestTimeout = TimeSpan.FromSeconds(5);
        private readonly GeneralSettings _generalSettings;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string _defaultAppUrl;
        private readonly IMemoryCache _cache;
        private readonly ILogger<LocalAppHttp> _logger;
        private readonly AppTunnelClient _appTunnelClient;
        private const string DefaultAppSentinel = "org/app";

        public LocalAppHttp(IOptions<GeneralSettings> generalSettings, IHttpClientFactory httpClientFactory, IOptions<LocalPlatformSettings> localPlatformSettings, IMemoryCache cache, ILogger<LocalAppHttp> logger, AppTunnelClient appTunnelClient)
        {
            _generalSettings = generalSettings.Value;
            _httpClientFactory = httpClientFactory;
            _defaultAppUrl = localPlatformSettings.Value.LocalAppUrl;
            _cache = cache;
            _logger = logger;
            _appTunnelClient = appTunnelClient;
        }

        private HttpClient CreateClient(string baseAddress)
        {
            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(baseAddress);
            return client;
        }

        private async Task<string> GetStringAsync(string requestUri, string? appId, CancellationToken cancellationToken)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
            using var response = await Send(request, appId, cancellationToken);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync(cancellationToken);
        }

        private async Task<HttpResponseMessage> Send(HttpRequestMessage request, string? appId, CancellationToken cancellationToken)
        {
            var tunnelAppId = NormalizeTunnelAppId(appId);
            if (_appTunnelClient.IsConnected)
            {
                try
                {
                    return await _appTunnelClient.Send(request, tunnelAppId, cancellationToken);
                }
                catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
                {
                    if (tunnelAppId is not null)
                        throw;

                    _logger.LogDebug(ex, "Tunnel request failed for app {AppId}, falling back to LocalAppUrl", appId);
                }
            }

            return await SendDirectAsync(request, _defaultAppUrl, cancellationToken);
        }

        private static string? NormalizeTunnelAppId(string? appId) =>
            string.IsNullOrWhiteSpace(appId) || string.Equals(appId, DefaultAppSentinel, StringComparison.Ordinal)
                ? null
                : appId;

        private async Task<HttpResponseMessage> SendDirectAsync(HttpRequestMessage request, string baseAddress, CancellationToken cancellationToken)
        {
            var client = CreateClient(baseAddress);

            if (request.RequestUri is null)
            {
                throw new InvalidOperationException("local app request is missing uri");
            }

            if (!request.RequestUri.IsAbsoluteUri)
            {
                request.RequestUri = new Uri(client.BaseAddress!, request.RequestUri);
            }

            return await client.SendAsync(request, cancellationToken);
        }

        public async Task<string?> GetXACMLPolicy(string appId, CancellationToken cancellationToken = default)
        {
            return await _cache.GetOrCreateAsync(XACML_CACHE_KEY + appId, async cacheEntry =>
            {
                // Cache with very short duration to not slow down page load, where this file can be accessed many many times
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                return await GetStringAsync($"{appId}/api/v1/meta/authorizationpolicy", appId, cancellationToken);
            });
        }
        public async Task<Application?> GetApplicationMetadata(string? appId, CancellationToken cancellationToken = default)
        {
            // When the AppPathSelection is null, check if there is exactly one app registered. If there are, that's
            // the default one (not the one on port 5005)
            if (string.IsNullOrWhiteSpace(appId))
            {
                var discoveredApps = await GetDiscoveredApps(cancellationToken);
                if (discoveredApps.Count == 1)
                {
                    appId = discoveredApps[0].AppId;
                }
            }

            // This works because we call with checkOrgApp=false later, and when the app is running on port 5005 it will
            // respond with the correct org/app id. If, however, the app is a registered one it runs on a dynamic port,
            // and so we have to look it up from the registry instead.
            appId ??= DefaultAppSentinel;
            var content = await _cache.GetOrCreateAsync(APPLICATION_METADATA_CACHE_KEY + appId, async cacheEntry =>
            {
                // Cache with very short duration to not slow down page load, where this file can be accessed many many times
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                using var timeoutCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutCancellationTokenSource.CancelAfter(ApplicationMetadataRequestTimeout);
                return await GetStringAsync(
                    $"{appId}/api/v1/applicationmetadata?checkOrgApp=false",
                    appId,
                    timeoutCancellationTokenSource.Token
                );
            });
            if (content is null)
            {
                throw new InvalidOperationException("application metadata response is missing");
            }

            return JsonSerializer.Deserialize<Application>(content, JSON_OPTIONS);
        }

        public async Task<TextResource?> GetTextResource(string org, string app, string language, CancellationToken cancellationToken = default)
        {
            var appId = $"{org}/{app}";
            var content = await _cache.GetOrCreateAsync(TEXT_RESOURCE_CACE_KEY + org + app + language, async cacheEntry =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                return await GetStringAsync($"{appId}/api/v1/texts/{language}", appId, cancellationToken);
            });

            var textResource = JsonSerializer.Deserialize<TextResource>(content!, JSON_OPTIONS);
            if (textResource != null)
            {
                textResource.Id = $"{org}-{app}-{language}";
                textResource.Org = org;
                textResource.Language = language;
                return textResource;
            }

            return null;
        }

        public async Task<Dictionary<string, Application>> GetApplications(CancellationToken cancellationToken = default)
        {
            var ret = new Dictionary<string, Application>();

            // Get all registered apps
            var discoveredApps = await GetDiscoveredApps(cancellationToken);
            foreach (var discoveredApp in discoveredApps)
            {
                try
                {
                    var app = await GetApplicationMetadata(discoveredApp.AppId, cancellationToken);
                    if (app != null)
                    {
                        ret.Add(app.Id, app);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get metadata for discovered app {AppId}", discoveredApp.AppId);
                }
            }

            if (ShouldProbeDefaultLocalApp(discoveredApps))
            {
                // Only use the legacy default app URL when no app has been registered through the tunnel.
                try
                {
                    var app = await GetApplicationMetadata(null, cancellationToken);
                    if (app != null && !ret.ContainsKey(app.Id))
                    {
                        ret.Add(app.Id, app);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "No app found on default port 5005");
                }
            }

            return ret;
        }

        public async Task<Instance?> Instantiate(string appId, Instance instance, string xmlPrefill, string xmlDataId, string token, CancellationToken cancellationToken = default)
        {
            var requestUri = $"{appId}/instances";
            var serializedInstance = JsonSerializer.Serialize(instance, new JsonSerializerOptions { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault });

            var content = new MultipartFormDataContent();
            content.Add(new StringContent(serializedInstance, System.Text.Encoding.UTF8, "application/json"), "instance");
            if (!string.IsNullOrWhiteSpace(xmlPrefill) && xmlDataId is not null)
            {
                content.Add(new StringContent(xmlPrefill, System.Text.Encoding.UTF8, "application/xml"), xmlDataId);
            }

            using var message = new HttpRequestMessage(HttpMethod.Post, requestUri);
            message.Content = content;
            message.Headers.Authorization = new ("Bearer", token);
            using var response = await Send(message, appId, cancellationToken);
            var stringResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(stringResponse);
            }

            return JsonSerializer.Deserialize<Instance>(stringResponse, new JsonSerializerOptions{PropertyNameCaseInsensitive = true});
        }

        private record FetchResult(AppTestDataModel? MergedData, bool AppWasReachable, bool AppHadData);

        public async Task<ILocalApp.TestDataResult> GetTestDataWithMetadata(CancellationToken cancellationToken = default)
        {
            var result = await _cache.GetOrCreateAsync(TEST_DATA_CACHE_KEY, async (cacheEntry) =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                AppTestDataModel? merged = null;
                int reachableApps = 0;
                int appsWithData = 0;

                var discoveredApps = await GetDiscoveredApps(cancellationToken);
                foreach (var discoveredApp in discoveredApps)
                {
                    try
                    {
                        var result = await FetchAndMergeTestData(discoveredApp.AppId, $"{discoveredApp.AppId}/testData.json", merged, cancellationToken);
                        if (result.AppWasReachable)
                        {
                            reachableApps++;
                            if (result.AppHadData)
                            {
                                appsWithData++;
                            }
                            merged = result.MergedData;
                        }
                    }
                    catch (InvalidOperationException ex)
                    {
                        _logger.LogCritical(ex, "Test data conflict detected when loading from app {AppId}", discoveredApp.AppId);
                        throw;
                    }
                }

                if (ShouldProbeDefaultLocalApp(discoveredApps))
                {
                    // Only use the legacy default app URL when no app has been registered through the tunnel.
                    try
                    {
                        var defaultAppMetadata = await GetApplicationMetadata(DefaultAppSentinel, cancellationToken);
                        if (defaultAppMetadata != null)
                        {
                            var defaultResult = await FetchAndMergeTestData(defaultAppMetadata.Id, $"{defaultAppMetadata.Id}/testData.json", merged, cancellationToken);

                            if (defaultResult.AppWasReachable)
                            {
                                reachableApps++;
                                if (defaultResult.AppHadData)
                                {
                                    appsWithData++;
                                }
                                merged = defaultResult.MergedData;
                            }
                        }
                    }
                    catch (InvalidOperationException ex)
                    {
                        _logger.LogCritical(ex, "Test data conflict detected when loading from default app");
                        throw;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "No default app found on port 5005");
                    }
                }

                var allHaveData = merged != null && reachableApps > 0 && appsWithData == reachableApps;
                _logger.LogInformation("GetTestDataWithMetadata: reachableApps={ReachableApps}, appsWithData={AppsWithData}, allHaveData={AllHaveData}",
                    reachableApps, appsWithData, allHaveData);

                return new ILocalApp.TestDataResult(merged, allHaveData);
            });

            return result ?? new ILocalApp.TestDataResult(null, false);
        }

        private static bool ShouldProbeDefaultLocalApp(IReadOnlyList<TunnelDiscoveredApp> discoveredApps) =>
            discoveredApps.Count == 0;

        private async Task<FetchResult> FetchAndMergeTestData(string? appId, string requestUri, AppTestDataModel? merged, CancellationToken cancellationToken = default)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
                using var response = await Send(request, appId, cancellationToken);
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return new FetchResult(merged, AppWasReachable: true, AppHadData: false);
                }

                response.EnsureSuccessStatusCode();
                var data = await response.Content.ReadAsByteArrayAsync(cancellationToken);
                var appData = JsonSerializer.Deserialize<AppTestDataModel>(data.RemoveBom(), JSON_OPTIONS);

                if (appData != null)
                {
                    if (merged == null)
                    {
                        return new FetchResult(appData, AppWasReachable: true, AppHadData: true);
                    }

                    var sourceModel = appData.GetTestDataModel();
                    var targetModel = merged.GetTestDataModel();

                    // MergeTestData will detect conflicts and throw if any already exist
                    TestDataMerger.MergeTestData(sourceModel, targetModel, appId ?? "default app");
                    merged = AppTestDataModel.FromTestDataModel(targetModel);
                    return new FetchResult(merged, AppWasReachable: true, AppHadData: true);
                }

                return new FetchResult(merged, AppWasReachable: true, AppHadData: false);
            }
            catch (Exception e) when (e is HttpRequestException or OperationCanceledException)
            {
                _logger.LogWarning(e, "Failed to get test data from app {AppId} - app appears to be offline", appId);
                return new FetchResult(merged, AppWasReachable: false, AppHadData: false);
            }
        }

        public void InvalidateTestDataCache()
        {
            _cache.Remove(TEST_DATA_CACHE_KEY);
        }

        private async Task<IReadOnlyList<TunnelDiscoveredApp>> GetDiscoveredApps(CancellationToken cancellationToken)
        {
            try
            {
                return await _appTunnelClient.GetDiscoveredApps(cancellationToken);
            }
            catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException or JsonException)
            {
                _logger.LogDebug(ex, "Failed to get discovered apps from app-manager");
                return [];
            }
        }
    }
}
