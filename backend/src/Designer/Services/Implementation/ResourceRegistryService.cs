using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class ResourceRegistryService : IResourceRegistry
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMaskinportenService _maskinPortenService;
        private readonly IClientDefinition _maskinportenClientDefinition;
        private readonly PlatformSettings _platformSettings;

        public ResourceRegistryService()
        {

        }

        public ResourceRegistryService(HttpClient httpClient, IHttpClientFactory httpClientFactory, IMaskinportenService maskinportenService, IClientDefinition maskinPortenClientDefinition, PlatformSettings platformSettings)
        {
            _httpClient = httpClient;
            _httpClientFactory = httpClientFactory;
            _maskinPortenService = maskinportenService;
            _maskinportenClientDefinition = maskinPortenClientDefinition;
            _platformSettings = platformSettings;
        }

        public async Task<ActionResult> PublishServiceResource(ServiceResource serviceResource, string env = null)
        {
            TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();
            string fullResourceRegistryUrl;

            if (env == null || string.IsNullOrEmpty(env))
            {
                return new StatusCodeResult(400);
            }

            //Checks if tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                fullResourceRegistryUrl = $"{string.Format(_platformSettings.ResourceRegistryEnvBaseUrl, env)}{_platformSettings.ResourceRegistryUrl}";
                tokenResponse = await _maskinPortenService.ExchangeToAltinnToken(tokenResponse, env);
            }
            else
            {
                fullResourceRegistryUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}";

                if (!_platformSettings.ResourceRegistryDefaultBaseUrl.Contains("localhost") && _platformSettings.ResourceRegistryDefaultBaseUrl.Contains("platform"))
                {
                    string[] splittedBaseUrl = _platformSettings.ResourceRegistryDefaultBaseUrl.Split('.');
                    env = splittedBaseUrl[1];
                    tokenResponse = await _maskinPortenService.ExchangeToAltinnToken(tokenResponse, env);
                }
            }

            string serviceResourceString = JsonConvert.SerializeObject(serviceResource);
            _httpClientFactory.CreateClient("myHttpClient");
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);

            HttpResponseMessage response = await _httpClient.PostAsync(fullResourceRegistryUrl, new StringContent(serviceResourceString, Encoding.UTF8, "application/json"));
            if (response.StatusCode == HttpStatusCode.Created)
            {
                return new StatusCodeResult(201);
            }
            else if (response.StatusCode == HttpStatusCode.Conflict)
            {
                return new StatusCodeResult(409);
            }
            else
            {
                return new StatusCodeResult(400);
            }
        }

        private async Task<TokenResponse> GetBearerTokenFromMaskinporten()
        {
            return await _maskinPortenService.GetToken(_maskinportenClientDefinition.ClientSettings.EncodedJwk, _maskinportenClientDefinition.ClientSettings.Environment, _maskinportenClientDefinition.ClientSettings.ClientId, _maskinportenClientDefinition.ClientSettings.Scope, _maskinportenClientDefinition.ClientSettings.Resource, _maskinportenClientDefinition.ClientSettings.ConsumerOrgNo);
        }
    }
}
