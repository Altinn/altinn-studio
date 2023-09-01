using System;
using System.IO;
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

        public async Task<ActionResult> PublishServiceResource(ServiceResource serviceResource, string env, string policy = null)
        {
            TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();
            string publishResourceToResourceRegistryUrl;
            string getResourceRegistryUrl;
            string fullWritePolicyToResourceRegistryUrl;

            if (env == null || string.IsNullOrEmpty(env))
            {
                return new StatusCodeResult(400);
            }

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                publishResourceToResourceRegistryUrl = $"{string.Format(_platformSettings.ResourceRegistryEnvBaseUrl, env)}{_platformSettings.ResourceRegistryUrl}";
                getResourceRegistryUrl = $"{publishResourceToResourceRegistryUrl}/{serviceResource.Identifier}";
                tokenResponse = await _maskinPortenService.ExchangeToAltinnToken(tokenResponse, env);

                fullWritePolicyToResourceRegistryUrl = $"{string.Format(_platformSettings.ResourceRegistryEnvBaseUrl, env)}{_platformSettings.ResourceRegistryUrl}/{serviceResource.Identifier}/policy";
            }
            else
            {
                publishResourceToResourceRegistryUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}";
                getResourceRegistryUrl = $"{string.Format(_platformSettings.ResourceRegistryDefaultBaseUrl, env)}{serviceResource.Identifier}";

                if (!_platformSettings.ResourceRegistryDefaultBaseUrl.Contains("localhost") && _platformSettings.ResourceRegistryDefaultBaseUrl.Contains("platform"))
                {
                    string[] splittedBaseUrl = _platformSettings.ResourceRegistryDefaultBaseUrl.Split('.');
                    env = splittedBaseUrl[1];
                    tokenResponse = await _maskinPortenService.ExchangeToAltinnToken(tokenResponse, env);
                }

                fullWritePolicyToResourceRegistryUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}/{serviceResource.Identifier}/policy";
            }

            string serviceResourceString = JsonConvert.SerializeObject(serviceResource);
            _httpClientFactory.CreateClient("myHttpClient");
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);

            if (policy != null)
            {
                MultipartFormDataContent content = new MultipartFormDataContent();

                byte[] policyFileContentBytes = File.ReadAllBytes(policy);
                ByteArrayContent fileContent = new ByteArrayContent(policyFileContentBytes);
                content.Add(fileContent, "policyFile", "policy.xml");
                HttpResponseMessage writePolicyResponse = await _httpClient.PostAsync(fullWritePolicyToResourceRegistryUrl, content);

                if (writePolicyResponse.IsSuccessStatusCode)
                {
                    Console.WriteLine("Policy written successfully!");
                }
                else
                {
                    Console.WriteLine($"Error writing policy. Status code: {writePolicyResponse.StatusCode}");
                    string responseContent = await writePolicyResponse.Content.ReadAsStringAsync();
                    Console.WriteLine($"Response content: {responseContent}");
                    return new StatusCodeResult(400);
                }
            }

            HttpResponseMessage getResourceResponse = await _httpClient.GetAsync(getResourceRegistryUrl);
            HttpResponseMessage putResponse = new HttpResponseMessage();

            if (getResourceResponse.IsSuccessStatusCode)
            {
                putResponse = await _httpClient.PutAsync(string.Format("{0}/{1}", publishResourceToResourceRegistryUrl, serviceResource.Identifier), new StringContent(serviceResourceString, Encoding.UTF8, "application/json"));
            }

            HttpResponseMessage response = await _httpClient.PostAsync(publishResourceToResourceRegistryUrl, new StringContent(serviceResourceString, Encoding.UTF8, "application/json"));
            if (response.StatusCode == HttpStatusCode.Created && putResponse.IsSuccessStatusCode)
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
