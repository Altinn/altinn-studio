#nullable enable

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Caching.Memory;

using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.TestData;
using LocalTest.Services.AppRegistry;
using LocalTest.Helpers;

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
        private readonly GeneralSettings _generalSettings;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string _defaultAppUrl;
        private readonly IMemoryCache _cache;
        private readonly ILogger<LocalAppHttp> _logger;
        private readonly AppRegistryService _appRegistryService;

        public LocalAppHttp(IOptions<GeneralSettings> generalSettings, IHttpClientFactory httpClientFactory, IOptions<LocalPlatformSettings> localPlatformSettings, IMemoryCache cache, ILogger<LocalAppHttp> logger, AppRegistryService appRegistryService)
        {
            _generalSettings = generalSettings.Value;
            _httpClientFactory = httpClientFactory;
            _defaultAppUrl = localPlatformSettings.Value.LocalAppUrl;
            _cache = cache;
            _logger = logger;
            _appRegistryService = appRegistryService;
        }

        private HttpClient CreateClient(string? appId = null)
        {
            var client = _httpClientFactory.CreateClient();

            // Try to get registered app first
            if (appId != null)
            {
                var registration = _appRegistryService.GetRegistration(appId);
                if (registration != null)
                {
                    client.BaseAddress = new Uri($"http://{registration.Hostname}:{registration.Port}");
                    client.Timeout = TimeSpan.FromHours(1);
                    return client;
                }
            }

            // Fallback to default URL (port 5005)
            client.BaseAddress = new Uri(_defaultAppUrl);
            client.Timeout = TimeSpan.FromHours(1);
            return client;
        }
        public async Task<string?> GetXACMLPolicy(string appId)
        {
            return await _cache.GetOrCreateAsync(XACML_CACHE_KEY + appId, async cacheEntry =>
            {
                // Cache with very short duration to not slow down page load, where this file can be accessed many many times
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                using var client = CreateClient(appId);
                return await client.GetStringAsync($"{appId}/api/v1/meta/authorizationpolicy");
            });
        }
        public async Task<Application?> GetApplicationMetadata(string? appId)
        {
            appId = appId ?? "dummyOrg/dummyApp";
            var content = await _cache.GetOrCreateAsync(APPLICATION_METADATA_CACHE_KEY + appId, async cacheEntry =>
            {
                // Cache with very short duration to not slow down page load, where this file can be accessed many many times
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                using var client = CreateClient(appId);
                return await client.GetStringAsync($"{appId}/api/v1/applicationmetadata?checkOrgApp=false");
            });

            return JsonSerializer.Deserialize<Application>(content!, JSON_OPTIONS);
        }

        public async Task<TextResource?> GetTextResource(string org, string app, string language)
        {
            var appId = $"{org}/{app}";
            var content = await _cache.GetOrCreateAsync(TEXT_RESOURCE_CACE_KEY + org + app + language, async cacheEntry =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                using var client = CreateClient(appId);
                return await client.GetStringAsync($"{appId}/api/v1/texts/{language}");
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

        public async Task<Dictionary<string, Application>> GetApplications()
        {
            var ret = new Dictionary<string, Application>();

            // Get all registered apps
            var registrations = _appRegistryService.GetAll();
            foreach (var registration in registrations.Values)
            {
                try
                {
                    var app = await GetApplicationMetadata(registration.AppId);
                    if (app != null)
                    {
                        ret.Add(app.Id, app);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get metadata for registered app {AppId}", registration.AppId);
                }
            }

            // Always try to get app from default port 5005
            // This allows both registered apps and the default app to coexist
            try
            {
                var app = await GetApplicationMetadata(null);
                if (app != null && !ret.ContainsKey(app.Id))
                {
                    ret.Add(app.Id, app);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "No app found on default port 5005");
            }

            return ret;
        }

        public async Task<Instance?> Instantiate(string appId, Instance instance, string xmlPrefill, string xmlDataId, string token)
        {
            var requestUri = $"{appId}/instances";
            var serializedInstance = JsonSerializer.Serialize(instance, new JsonSerializerOptions { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault });

            var content = new MultipartFormDataContent();
            content.Add(new StringContent(serializedInstance, System.Text.Encoding.UTF8, "application/json"), "instance");
            if (!string.IsNullOrWhiteSpace(xmlPrefill) && xmlDataId is not null)
            {
                content.Add(new StringContent(xmlPrefill, System.Text.Encoding.UTF8, "application/xml"), xmlDataId);
            }

            using var client = CreateClient(appId);
            using var message = new HttpRequestMessage(HttpMethod.Post, requestUri);
            message.Content = content;
            message.Headers.Authorization = new ("Bearer", token);
            var response = await client.SendAsync(message);
            var stringResponse = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(stringResponse);
            }

            return JsonSerializer.Deserialize<Instance>(stringResponse, new JsonSerializerOptions{PropertyNameCaseInsensitive = true});
        }

        public record TestDataResult(AppTestDataModel? Data, bool AllAppsHaveData);

        private record FetchResult(AppTestDataModel? MergedData, bool AppWasReachable, bool AppHadData);

        public async Task<AppTestDataModel?> GetTestData()
        {
            var result = await GetTestDataWithMetadata();
            return result.Data;
        }

        public async Task<TestDataResult> GetTestDataWithMetadata()
        {
            var result = await _cache.GetOrCreateAsync(TEST_DATA_CACHE_KEY, async (cacheEntry) =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                AppTestDataModel? merged = null;
                int reachableApps = 0;
                int appsWithData = 0;

                var registrations = _appRegistryService.GetAll();
                foreach (var registration in registrations.Values)
                {
                    try
                    {
                        var result = await FetchAndMergeTestData(registration.AppId, $"{registration.AppId}/testData.json", merged);
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
                        _logger.LogCritical(ex, "Test data conflict detected when loading from app {AppId}", registration.AppId);
                        throw;
                    }
                }

                // Also try default app (port 5005) as fallback
                try
                {
                    var defaultAppMetadata = await GetApplicationMetadata(null);
                    if (defaultAppMetadata != null)
                    {
                        var defaultResult = await FetchAndMergeTestData(defaultAppMetadata.Id, $"{defaultAppMetadata.Id}/testData.json", merged);

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

                var allHaveData = merged != null && reachableApps > 0 && appsWithData == reachableApps;
                _logger.LogInformation("GetTestDataWithMetadata: reachableApps={ReachableApps}, appsWithData={AppsWithData}, allHaveData={AllHaveData}",
                    reachableApps, appsWithData, allHaveData);

                return new TestDataResult(merged, allHaveData);
            });

            return result ?? new TestDataResult(null, false);
        }

        private async Task<FetchResult> FetchAndMergeTestData(string? appId, string requestUri, AppTestDataModel? merged)
        {
            try
            {
                using var client = CreateClient(appId);
                var response = await client.GetAsync(requestUri);
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return new FetchResult(merged, AppWasReachable: true, AppHadData: false);
                }

                response.EnsureSuccessStatusCode();
                var data = await response.Content.ReadAsByteArrayAsync();
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
            catch (HttpRequestException e)
            {
                _logger.LogWarning(e, "Failed to get test data from app {AppId} - app appears to be offline", appId);
                return new FetchResult(merged, AppWasReachable: false, AppHadData: false);
            }
        }

        public void InvalidateTestDataCache()
        {
            _cache.Remove(TEST_DATA_CACHE_KEY);
        }
    }
}
