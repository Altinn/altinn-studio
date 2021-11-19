#nullable enable
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;

namespace LocalTest.Services.LocalApp.Implementation
{
    public class LocalAppHttp : ILocalApp
    {
        private readonly HttpClient _httpClient;
        public LocalAppHttp(IHttpClientFactory httpClientFactory, IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.BaseAddress = new Uri(localPlatformSettings.Value.LocalAppUrl);
        }
        public async Task<string?> GetXACMLPolicy(string appId)
        {
            return await _httpClient.GetStringAsync($"{appId}/api/v1/meta/authorizationpolicy");
        }
        public async Task<Application?> GetApplicationMetadata(string appId)
        {
            var content = await _httpClient.GetStringAsync($"{appId}/api/v1/applicationmetadata?checkOrgApp=false");
            return JsonConvert.DeserializeObject<Application>(content);
        }
        
        public async Task<Dictionary<string, Application>> GetApplications()
        {
            var ret = new Dictionary<string, Application>();
            // Return a single element as only one app can run on port 5005
            try
            {
                var app = await GetApplicationMetadata("dummyOrg/dummyApp");
                if (app != null)
                {
                    ret.Add(app.Id, app);
                }
            }
            catch(HttpRequestException e)
            {
                if(e.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    ret.Add("", new Application{ Id = "Please update your app to use the latest Altinn.App.* packages"});
                }
                // else if (e.InnerException == )
                // {

                // }
                else
                {
                    throw;
                }
            }
            
            return ret;
        }
    }
}