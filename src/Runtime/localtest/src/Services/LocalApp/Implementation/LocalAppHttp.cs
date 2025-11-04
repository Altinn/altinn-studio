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
        private readonly AppRegistryService? _appRegistryService;

        public LocalAppHttp(IOptions<GeneralSettings> generalSettings, IHttpClientFactory httpClientFactory, IOptions<LocalPlatformSettings> localPlatformSettings, IMemoryCache cache, ILogger<LocalAppHttp> logger, AppRegistryService? appRegistryService = null)
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
            if (appId != null && _appRegistryService != null)
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
            if (_appRegistryService != null)
            {
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
            }

            // Fallback: try to get app from default port 5005 if no apps registered
            if (ret.Count == 0)
            {
                try
                {
                    var app = await GetApplicationMetadata(null);
                    if (app != null)
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

        public async Task<AppTestDataModel?> GetTestData()
        {
            return await _cache.GetOrCreateAsync(TEST_DATA_CACHE_KEY, async (cacheEntry) =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));

                try
                {
                    var applicationmetadata = await GetApplicationMetadata(null);
                    if (applicationmetadata is null)
                    {
                        return null;
                    }

                    using var client = CreateClient(applicationmetadata.Id);
                    var response = await client.GetAsync($"{applicationmetadata.Id}/testData.json");
                    if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        _logger.LogInformation("No custom www/testData.json found. Using default test users");
                        return null;
                    }

                    response.EnsureSuccessStatusCode();
                    var data = await response.Content.ReadAsByteArrayAsync();
                    return JsonSerializer.Deserialize<AppTestDataModel>(data.RemoveBom(), JSON_OPTIONS);
                }
                catch (HttpRequestException e)
                {
                    _logger.LogCritical(e, "Failed to get Test data");
                    return null;
                }

            });
        }
    }
}
