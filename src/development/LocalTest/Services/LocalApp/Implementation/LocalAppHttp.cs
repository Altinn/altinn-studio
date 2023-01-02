#nullable enable

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Caching.Memory;

using Altinn.Platform.Storage.Interface.Models;
using LocalTest.Services.Authentication.Interface;

using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.TestData;

namespace LocalTest.Services.LocalApp.Implementation
{
    public class LocalAppHttp : ILocalApp
    {
        public static readonly JsonSerializerOptions JSON_OPTIONS = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        };
        public const string XACML_CACHE_KEY = "/api/v1/meta/authorizationpolicy/";
        public const string APPLICATION_METADATA_CACHE_KEY = "/api/v1/applicationmetadata?checkOrgApp=false";
        public const string TEXT_RESOURCE_CACE_KEY = "/api/v1/texts";
        public const string TEST_DATA_CACHE_KEY = "TEST_DATA_CACHE_KEY";
        private readonly GeneralSettings _generalSettings;
        private readonly IAuthentication _authenticationService;
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly ILogger<LocalAppHttp> _logger;

        public LocalAppHttp(IOptions<GeneralSettings> generalSettings, IAuthentication authenticationService, IHttpClientFactory httpClientFactory, IOptions<LocalPlatformSettings> localPlatformSettings, IMemoryCache cache, ILogger<LocalAppHttp> logger)
        {
            _generalSettings = generalSettings.Value;
            _authenticationService = authenticationService;
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.BaseAddress = new Uri(localPlatformSettings.Value.LocalAppUrl);
            _httpClient.Timeout = TimeSpan.FromHours(1);
            _cache = cache;
            _logger = logger;
        }
        public async Task<string?> GetXACMLPolicy(string appId)
        {
            return await _cache.GetOrCreateAsync(XACML_CACHE_KEY + appId, async cacheEntry =>
            {
                // Cache with very short duration to not slow down page load, where this file can be accessed many many times
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                return await _httpClient.GetStringAsync($"{appId}/api/v1/meta/authorizationpolicy");
            });
        }
        public async Task<Application?> GetApplicationMetadata(string? appId)
        {
            appId = appId ?? "dummyOrg/dummyApp";
            var content = await _cache.GetOrCreateAsync(APPLICATION_METADATA_CACHE_KEY + appId, async cacheEntry =>
            {
                // Cache with very short duration to not slow down page load, where this file can be accessed many many times
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                return await _httpClient.GetStringAsync($"{appId}/api/v1/applicationmetadata?checkOrgApp=false");
            });

            return JsonSerializer.Deserialize<Application>(content, JSON_OPTIONS);
        }

        public async Task<TextResource?> GetTextResource(string org, string app, string language)
        {
            var content = await _cache.GetOrCreateAsync(TEXT_RESOURCE_CACE_KEY + org + app + language, async cacheEntry =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                return await _httpClient.GetStringAsync($"{org}/{app}/api/v1/texts/{language}");
            });

            var textResource = JsonSerializer.Deserialize<TextResource>(content, JSON_OPTIONS);
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
            // Return a single element as only one app can run on port 5005
            var app = await GetApplicationMetadata(null);
            if (app != null)
            {
                ret.Add(app.Id, app);
            }

            return ret;
        }

        public async Task<Instance?> Instantiate(string appId, Instance instance, string xmlPrefill, string xmlDataId)
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
            message.Headers.Authorization = new ("Bearer", await _authenticationService.GenerateTokenForOrg(appId.Split("/")[0]));
            var response = await _httpClient.SendAsync(message);
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

                    var response = await _httpClient.GetAsync($"{applicationmetadata.Id}/testData.json");
                    if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        _logger.LogInformation("No custom www/testData.json found. Using default test users");
                        return null;
                    }

                    response.EnsureSuccessStatusCode();
                    return JsonSerializer.Deserialize<AppTestDataModel>(await response.Content.ReadAsByteArrayAsync(), JSON_OPTIONS);
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
