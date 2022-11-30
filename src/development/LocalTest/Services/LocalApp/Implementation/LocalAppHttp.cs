#nullable enable
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Caching.Memory;

using Altinn.Platform.Storage.Interface.Models;
using LocalTest.Services.Authentication.Interface;
using AltinnCore.Authentication.Constants;

using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;

namespace LocalTest.Services.LocalApp.Implementation
{
    public class LocalAppHttp : ILocalApp
    {
        public const string XACML_CACHE_KEY = "/api/v1/meta/authorizationpolicy/";
        public const string APPLICATION_METADATA_CACHE_KEY = "/api/v1/applicationmetadata?checkOrgApp=false";
        public const string TEXT_RESOURCE_CACE_KEY = "/api/v1/texts";
        private readonly GeneralSettings _generalSettings;
        private readonly IAuthentication _authenticationService;
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        public LocalAppHttp(IOptions<GeneralSettings> generalSettings, IAuthentication authenticationService, IHttpClientFactory httpClientFactory, IOptions<LocalPlatformSettings> localPlatformSettings, IMemoryCache cache)
        {
            _generalSettings = generalSettings.Value;
            _authenticationService = authenticationService;
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.BaseAddress = new Uri(localPlatformSettings.Value.LocalAppUrl);
            _httpClient.Timeout = TimeSpan.FromHours(1);
            _cache = cache;
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
        public async Task<Application?> GetApplicationMetadata(string appId)
        {
            var content = await _cache.GetOrCreateAsync(APPLICATION_METADATA_CACHE_KEY + appId, async cacheEntry =>
            {
                // Cache with very short duration to not slow down page load, where this file can be accessed many many times
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                return await _httpClient.GetStringAsync($"{appId}/api/v1/applicationmetadata?checkOrgApp=false");
            });
            return JsonSerializer.Deserialize<Application>(content, new JsonSerializerOptions{PropertyNameCaseInsensitive = true} );
        }

        public async Task<TextResource?> GetTextResource(string org, string app, string language)
        {
            var content = await _cache.GetOrCreateAsync(TEXT_RESOURCE_CACE_KEY + org + app + language, async cacheEntry =>
            {
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                return await _httpClient.GetStringAsync($"{org}/{app}/api/v1/texts/{language}");
            });

            var textResource = JsonSerializer.Deserialize<TextResource>(content, new JsonSerializerOptions{PropertyNameCaseInsensitive = true});
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
            var app = await GetApplicationMetadata("dummyOrg/dummyApp");
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
    }
}
