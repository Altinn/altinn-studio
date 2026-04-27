#nullable enable

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;

using Altinn.Studio.EnvTopology;
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
        private readonly IMemoryCache _cache;
        private readonly ILogger<LocalAppHttp> _logger;
        private readonly AppTunnelClient _appTunnelClient;
        private readonly BoundTopologyIndexAccessor _boundTopologyIndex;

        public LocalAppHttp(
            IMemoryCache cache,
            ILogger<LocalAppHttp> logger,
            AppTunnelClient appTunnelClient,
            BoundTopologyIndexAccessor boundTopologyIndex
        )
        {
            _cache = cache;
            _logger = logger;
            _appTunnelClient = appTunnelClient;
            _boundTopologyIndex = boundTopologyIndex;
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
            if (!_appTunnelClient.IsConnected)
            {
                throw new InvalidOperationException("app tunnel is not connected");
            }

            var resolvedRoute = ResolveAppRoute(appId);
            if (resolvedRoute is null)
            {
                throw new InvalidOperationException("local app request requires an app id");
            }
            return await _appTunnelClient.SendToTarget(
                request,
                resolvedRoute.TargetHost,
                resolvedRoute.TargetPort,
                cancellationToken
            );
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
            appId = ResolveAppRoute(appId)?.AppId;
            if (string.IsNullOrWhiteSpace(appId))
            {
                return null;
            }

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

            foreach (var appRoute in GetBoundAppRoutes())
            {
                try
                {
                    var app = await GetApplicationMetadata(appRoute.AppId, cancellationToken);
                    if (app != null)
                    {
                        ret.Add(app.Id, app);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get metadata for discovered app {AppId}", appRoute.AppId);
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

                foreach (var appRoute in GetBoundAppRoutes())
                {
                    try
                    {
                        var result = await FetchAndMergeTestData(appRoute.AppId, $"{appRoute.AppId}/testData.json", merged, cancellationToken);
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
                        _logger.LogCritical(ex, "Test data conflict detected when loading from app {AppId}", appRoute.AppId);
                        throw;
                    }
                }

                var allHaveData = merged != null && reachableApps > 0 && appsWithData == reachableApps;
                _logger.LogInformation("GetTestDataWithMetadata: reachableApps={ReachableApps}, appsWithData={AppsWithData}, allHaveData={AllHaveData}",
                    reachableApps, appsWithData, allHaveData);

                return new ILocalApp.TestDataResult(merged, allHaveData);
            });

            return result ?? new ILocalApp.TestDataResult(null, false);
        }

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
                    TestDataMerger.MergeTestData(sourceModel, targetModel, appId ?? "unknown app");
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

        private IReadOnlyList<BoundTopologyAppRoute> GetBoundAppRoutes()
        {
            return _boundTopologyIndex.Current.GetApps();
        }

        private BoundTopologyAppRoute? ResolveAppRoute(string? appId)
        {
            var index = _boundTopologyIndex.Current;
            if (!string.IsNullOrWhiteSpace(appId))
            {
                return index.TryGetApp(appId);
            }

            return index.TryGetSingleApp();
        }
    }
}
