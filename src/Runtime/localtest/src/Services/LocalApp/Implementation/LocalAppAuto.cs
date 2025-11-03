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
    /// <summary>
    /// ILocalApp implementation for auto mode with dynamic app registration
    /// </summary>
    public class LocalAppAuto : ILocalApp
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
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;
        private readonly ILogger<LocalAppAuto> _logger;
        private readonly AppRegistryService _appRegistryService;

        public LocalAppAuto(
            IOptions<GeneralSettings> generalSettings,
            IOptions<LocalPlatformSettings> localPlatformSettings,
            IHttpClientFactory httpClientFactory,
            IMemoryCache cache,
            ILogger<LocalAppAuto> logger,
            AppRegistryService appRegistryService)
        {
            _generalSettings = generalSettings.Value;
            _localPlatformSettings = localPlatformSettings.Value;
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _logger = logger;
            _appRegistryService = appRegistryService;
        }

        private HttpClient CreateClientForApp(string appId)
        {
            var registration = _appRegistryService.GetRegistration(appId);
            if (registration == null)
            {
                throw new InvalidOperationException($"App {appId} is not registered");
            }

            var client = _httpClientFactory.CreateClient();
            // Use the registered hostname (defaults to host.docker.internal for apps running on host)
            client.BaseAddress = new Uri($"http://{registration.Hostname}:{registration.Port}");
            client.Timeout = TimeSpan.FromHours(1);
            return client;
        }

        public async Task<string?> GetXACMLPolicy(string appId)
        {
            return await _cache.GetOrCreateAsync(XACML_CACHE_KEY + appId, async cacheEntry =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                using var client = CreateClientForApp(appId);
                return await client.GetStringAsync($"{appId}/api/v1/meta/authorizationpolicy");
            });
        }

        public async Task<Application?> GetApplicationMetadata(string? appId)
        {
            if (appId == null)
            {
                // Return first registered app if no appId specified
                var registrations = _appRegistryService.GetAll();
                if (registrations.Count == 0)
                {
                    return null;
                }
                appId = registrations.First().Key;
            }

            var content = await _cache.GetOrCreateAsync(APPLICATION_METADATA_CACHE_KEY + appId, async cacheEntry =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                using var client = CreateClientForApp(appId);
                return await client.GetStringAsync($"{appId}/api/v1/applicationmetadata?checkOrgApp=false");
            });

            return JsonSerializer.Deserialize<Application>(content!, JSON_OPTIONS);
        }

        public async Task<TextResource?> GetTextResource(string org, string app, string language)
        {
            var appId = $"{org}/{app}";
            var content = await _cache.GetOrCreateAsync(TEXT_RESOURCE_CACE_KEY + $"{org}:{app}:{language}", async cacheEntry =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                using var client = CreateClientForApp(appId);
                return await client.GetStringAsync($"{org}/{app}/api/v1/texts/{language}");
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
                    _logger.LogWarning(ex, "Failed to get application metadata for {AppId}", registration.AppId);
                }
            }

            return ret;
        }

        public async Task<Instance?> Instantiate(string appId, Instance instance, string xmlPrefill, string xmlDataId, string token)
        {
            using var client = CreateClientForApp(appId);
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

                    using var client = CreateClientForApp(applicationmetadata.Id);
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

        public async Task<AppTestDataModel?> GetTestData(string appId)
        {
            return await _cache.GetOrCreateAsync(TEST_DATA_CACHE_KEY + appId, async (cacheEntry) =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));

                try
                {
                    using var client = CreateClientForApp(appId);
                    var response = await client.GetAsync($"{appId}/testData.json");
                    if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        _logger.LogInformation("No custom www/testData.json found for {AppId}. Using default test users", appId);
                        return null;
                    }

                    response.EnsureSuccessStatusCode();
                    var data = await response.Content.ReadAsByteArrayAsync();
                    return JsonSerializer.Deserialize<AppTestDataModel>(data.RemoveBom(), JSON_OPTIONS);
                }
                catch (HttpRequestException e)
                {
                    _logger.LogWarning(e, "Failed to get Test data for {AppId}", appId);
                    return null;
                }

            });
        }
    }
}
