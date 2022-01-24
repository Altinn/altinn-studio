#nullable enable
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;

using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;

namespace LocalTest.Services.LocalApp.Implementation
{
    public class LocalAppHttp : ILocalApp
    {
        public const string XACML_CACHE_KEY = "/api/v1/meta/authorizationpolicy/";
        public const string APPLICATION_METADATA_CACHE_KEY = "/api/v1/applicationmetadata?checkOrgApp=false";
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        public LocalAppHttp(IHttpClientFactory httpClientFactory, IOptions<LocalPlatformSettings> localPlatformSettings, IMemoryCache cache)
        {
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.BaseAddress = new Uri(localPlatformSettings.Value.LocalAppUrl);
            _cache = cache;
        }
        public async Task<string?> GetXACMLPolicy(string appId)
        {
            return await _cache.GetOrCreateAsync(XACML_CACHE_KEY + appId, async cacheEntry => {
                // Cache with very short duration to not slow down page load, where this file can be accessed many many times
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                return await _httpClient.GetStringAsync($"{appId}/api/v1/meta/authorizationpolicy");
            });
        }
        public async Task<Application?> GetApplicationMetadata(string appId)
        {
            var content = await _cache.GetOrCreateAsync(APPLICATION_METADATA_CACHE_KEY + appId, async cacheEntry => {
                // Cache with very short duration to not slow down page load, where this file can be accessed many many times
                cacheEntry.SetSlidingExpiration(TimeSpan.FromSeconds(5));
                return await _httpClient.GetStringAsync($"{appId}/api/v1/applicationmetadata?checkOrgApp=false");
            });
            return JsonConvert.DeserializeObject<Application>(content);
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
    }
}
