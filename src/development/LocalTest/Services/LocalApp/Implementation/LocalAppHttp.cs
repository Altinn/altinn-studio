#nullable enable
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;

using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Services.LocalApp.Interface;

namespace LocalTest.Services.LocalApp.Implementation
{
    public class LocalAppHttp : ILocalApp
    {
        private readonly HttpClient _httpClient;
        public LocalAppHttp(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.BaseAddress = new Uri("http://host.docker.internal:5005");
        }
        public async Task<string?> GetXACMLPolicy(string appId)
        {
            return await _httpClient.GetStringAsync($"{appId}/api/v1/policy.xml");
        }
        public async Task<Application?> GetApplicationMetadata(string appId)
        {
            var content = await _httpClient.GetStringAsync($"{appId}/api/v1/applicationmetadata");
            return JsonConvert.DeserializeObject<Application>(content);
        }
        
        public async Task<Dictionary<string, Application>> GetApplications()
        {
            var ret = new Dictionary<string, Application>();
            // Return a single element as only one app can run on port 5005
            var appId = await GetAppId();
            if (appId != null)
            {
                var app = await GetApplicationMetadata(appId);
                if (app != null)
                {
                    ret.Add(appId, app);
                }
            }
            
            return ret;
        }
        public async Task<string?> GetAppId()
        {
            var appId = "dummyOrg/dummyApp";
            return await _httpClient.GetStringAsync($"{appId}/api/v1/AppId");
        }
    }
}