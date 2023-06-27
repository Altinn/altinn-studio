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

        public async Task<ActionResult> PublishServiceResource(ServiceResource serviceResource)
        {
            string resourceRegistryUrl = _platformSettings.ResourceRegistryUrl;
            string serviceResourceString = JsonConvert.SerializeObject(serviceResource);

            TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();
            _httpClientFactory.CreateClient("myHttpClient");

            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);
            HttpResponseMessage response = await _httpClient.PostAsync(resourceRegistryUrl, new StringContent(serviceResourceString, Encoding.UTF8, "application/json"));
            if (response.StatusCode == HttpStatusCode.Created)
            {
                return new StatusCodeResult(201);
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
