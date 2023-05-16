using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.ApiClients.Maskinporten.Config;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
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
        //private readonly IMaskinportenClient _maskinportenClient;
        private readonly IMaskinportenService _maskinPortenService; //TODO: Vurdere om denne heller skal brukes fra en egen klasse
        private readonly MaskinPortenClientDefinition _maskinportenClientDefinition;

        public ResourceRegistryService()
        {

        }

        public ResourceRegistryService(HttpClient httpClient, IHttpClientFactory httpClientFactory, IMaskinportenService maskinportenService, MaskinPortenClientDefinition maskinPortenClientDefinition)
        {
            _httpClient = httpClient;
            _httpClientFactory = httpClientFactory;
            _maskinPortenService = maskinportenService;
            _maskinportenClientDefinition = maskinPortenClientDefinition;
        }

        public async Task<ActionResult> PublishServiceResource(ServiceResource serviceResource)
        {
            string resourceRegistryUrl = $"resourceregistry/api/v1/resource";
            string serviceResourceString = JsonConvert.SerializeObject(serviceResource);

            TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();

            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);
            HttpResponseMessage response = await _httpClient.PostAsync(resourceRegistryUrl, new StringContent(serviceResourceString, Encoding.UTF8, "application/json"));
            if (response.StatusCode == HttpStatusCode.OK)
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

        private async Task<TokenResponse> ExchangeToken(TokenResponse tokenResponse, string environment)
        {
            return await _maskinPortenService.ExchangeToAltinnToken(tokenResponse, environment);
        }
    }
}
