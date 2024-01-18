using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Exceptions;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Azure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class ResourceRegistryService : IResourceRegistry
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMaskinportenService _maskinPortenService;
        private readonly IClientDefinition _maskinportenClientDefinition;
        private readonly PlatformSettings _platformSettings;
        private readonly ResourceRegistryIntegrationSettings _resourceRegistrySettings;
        private readonly ResourceRegistryMaskinportenIntegrationSettings _maskinportenIntegrationSettings;
        private readonly JsonSerializerOptions _serializerOptions = new JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase, WriteIndented = true };

        public ResourceRegistryService()
        {

        }

        public ResourceRegistryService(HttpClient httpClient, IHttpClientFactory httpClientFactory, IMaskinportenService maskinportenService, IClientDefinition maskinPortenClientDefinition, PlatformSettings platformSettings, IOptions<ResourceRegistryIntegrationSettings> resourceRegistryEnvironment, IOptions<ResourceRegistryMaskinportenIntegrationSettings> maskinportenIntegrationSettings)
        {
            _httpClient = httpClient;
            _httpClientFactory = httpClientFactory;
            _maskinPortenService = maskinportenService;
            _maskinportenClientDefinition = maskinPortenClientDefinition;
            _platformSettings = platformSettings;
            _resourceRegistrySettings = resourceRegistryEnvironment.Value;
            _maskinportenIntegrationSettings = maskinportenIntegrationSettings.Value;
        }

        public async Task<ActionResult> PublishServiceResource(ServiceResource serviceResource, string env, string policyPath = null)
        {
            _maskinportenClientDefinition.ClientSettings = GetMaskinportenIntegrationSettings(env);
            TokenResponse tokenResponse = await GetBearerTokenFromMaskinporten();
            string publishResourceToResourceRegistryUrl;
            string getResourceRegistryUrl;
            string fullWritePolicyToResourceRegistryUrl;


            if (string.IsNullOrEmpty(env))
            {
                return new StatusCodeResult(400);
            }

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                publishResourceToResourceRegistryUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}";
                getResourceRegistryUrl = $"{publishResourceToResourceRegistryUrl}/{serviceResource.Identifier}";
                tokenResponse = await _maskinPortenService.ExchangeToAltinnToken(tokenResponse, env);
                fullWritePolicyToResourceRegistryUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}/{serviceResource.Identifier}/policy";
            }
            else
            {
                publishResourceToResourceRegistryUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}";
                getResourceRegistryUrl = $"{string.Format(_platformSettings.ResourceRegistryDefaultBaseUrl, env)}/{serviceResource.Identifier}";
                fullWritePolicyToResourceRegistryUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}/{serviceResource.Identifier}/policy";
            }

            string serviceResourceString = System.Text.Json.JsonSerializer.Serialize(serviceResource, _serializerOptions);
            _httpClientFactory.CreateClient("myHttpClient");
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResponse.AccessToken);

            HttpResponseMessage getResourceResponse = await _httpClient.GetAsync(getResourceRegistryUrl);

            HttpResponseMessage response;

            if (getResourceResponse.IsSuccessStatusCode && getResourceResponse.StatusCode.Equals(HttpStatusCode.OK))
            {
                string putRequest = $"{publishResourceToResourceRegistryUrl}/{serviceResource.Identifier}";
                using (StringContent putContent = new StringContent(serviceResourceString, Encoding.UTF8, "application/json"))
                {
                    response = await _httpClient.PutAsync(putRequest, putContent);
                }
            }
            else
            {
                using (StringContent postContent = new StringContent(serviceResourceString, Encoding.UTF8, "application/json"))
                {
                    response = await _httpClient.PostAsync(publishResourceToResourceRegistryUrl, postContent);
                }
            }

            if (!response.IsSuccessStatusCode)
            {
                return await GetPublishResponse(response);
            }

            if (policyPath != null)
            {
                MultipartFormDataContent content = new MultipartFormDataContent();

                if (ResourceAdminHelper.ValidFilePath(policyPath))
                {
                    byte[] policyFileContentBytes;

                    try
                    {
                        string canonicalPolicyPath = Path.GetFullPath(policyPath);

                        if (canonicalPolicyPath.EndsWith(".xml"))
                        {
                            policyFileContentBytes = File.ReadAllBytes(policyPath);
                        }
                        else
                        {
                            return new StatusCodeResult(400);
                        }
                    }
                    catch (Exception)
                    {
                        Console.WriteLine($"Error while reading policy from path {policyPath}");
                        return new StatusCodeResult(400);
                    }

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
                else
                {
                    Console.WriteLine($"Invalid filepath for policyfile. Path: {policyPath}");
                    return new StatusCodeResult(400);
                }
            }

            return await GetPublishResponse(response);
        }

        public async Task<ServiceResource> GetResource(string id, string env)
        {
            string resourceUrl;

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                resourceUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}/{id}";
            }
            else
            {
                resourceUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}/{id}/policy";
            }

            HttpResponseMessage getResourceResponse = await _httpClient.GetAsync(resourceUrl);
            if (getResourceResponse.StatusCode.Equals(HttpStatusCode.OK))
            {
                string responseContent = await getResourceResponse.Content.ReadAsStringAsync();
                ServiceResource res = JsonSerializer.Deserialize<ServiceResource>(responseContent, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                return res;
            }

            return null;
        }

        public async Task<List<ServiceResource>> GetResources(string env)
        {
            string resourceUrl;

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                resourceUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}/search/";
            }
            else
            {
                resourceUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}/search/";
            }

            HttpResponseMessage getResourceResponse = await _httpClient.GetAsync(resourceUrl);
            if (getResourceResponse.StatusCode.Equals(HttpStatusCode.OK))
            {
                string responseContent = await getResourceResponse.Content.ReadAsStringAsync();
                List<ServiceResource> res = JsonSerializer.Deserialize<List<ServiceResource>>(responseContent, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                return res;
            }

            return null;
        }

        /// <summary>
        ///     Get resource list
        /// </summary>
        /// <returns>List of all resources</returns>
        public async Task<List<ServiceResource>> GetResourceList(string env)
        {

            string endpointUrl;

            //Checks if not tested locally by passing dev as env parameter
            if (!env.ToLower().Equals("dev"))
            {
                endpointUrl = $"{GetResourceRegistryBaseUrl(env)}{_platformSettings.ResourceRegistryUrl}/resourcelist/";
            }
            else
            {
                endpointUrl = $"{_platformSettings.ResourceRegistryDefaultBaseUrl}{_platformSettings.ResourceRegistryUrl}/resourcelist/";
            }

            JsonSerializerOptions options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            };
            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(endpointUrl);
                string content = await response.Content.ReadAsStringAsync();

                if (response.StatusCode == HttpStatusCode.OK)
                {
                    return JsonSerializer.Deserialize<List<ServiceResource>>(content, options);
                }

                HttpStatusException error = JsonSerializer.Deserialize<HttpStatusException>(content, options);
                throw error;
            }
            catch (Exception ex) when (ex is not HttpStatusException)
            {
                throw;
            }
        }

        private async Task<TokenResponse> GetBearerTokenFromMaskinporten()
        {
            return await _maskinPortenService.GetToken(_maskinportenClientDefinition.ClientSettings.EncodedJwk, _maskinportenClientDefinition.ClientSettings.Environment, _maskinportenClientDefinition.ClientSettings.ClientId, _maskinportenClientDefinition.ClientSettings.Scope, _maskinportenClientDefinition.ClientSettings.Resource, _maskinportenClientDefinition.ClientSettings.ConsumerOrgNo);
        }

        private async Task<ActionResult> GetPublishResponse(HttpResponseMessage response)
        {
            if (response.StatusCode == HttpStatusCode.Created)
            {
                return new StatusCodeResult(201);
            }
            else if (response.StatusCode == HttpStatusCode.Conflict)
            {
                return new StatusCodeResult(409);
            }
            else if (response.StatusCode == HttpStatusCode.BadRequest)
            {
                string responseContent = await response.Content.ReadAsStringAsync();
                try
                {
                    ValidationProblemDetails problems = JsonSerializer.Deserialize<ValidationProblemDetails>(responseContent);
                    return new ObjectResult(problems) { StatusCode = (int)response.StatusCode };
                }
                catch (Exception)
                {
                    return new ContentResult() { Content = responseContent, StatusCode = (int)response.StatusCode };
                }
            }
            else if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                string responseContent = await response.Content.ReadAsStringAsync();
                return new ContentResult() { Content = responseContent, StatusCode = (int)HttpStatusCode.Forbidden };
            }
            else
            {
                string responseContent = await response.Content.ReadAsStringAsync();
                try
                {
                    ProblemDetails problems = JsonSerializer.Deserialize<ProblemDetails>(responseContent);
                    return new ObjectResult(problems) { StatusCode = (int)response.StatusCode };
                }
                catch (Exception)
                {
                    return new ContentResult() { Content = responseContent, StatusCode = (int)response.StatusCode };
                }
            }
        }

        private string GetResourceRegistryBaseUrl(string env)
        {
            if (!_resourceRegistrySettings.TryGetValue(env, out ResourceRegistryEnvironmentSettings envSettings))
            {
                throw new ArgumentException($"Invalid environment. Missing environment config for {env}");
            }

            return envSettings.ResourceRegistryEnvBaseUrl;
        }

        private MaskinportenClientSettings GetMaskinportenIntegrationSettings(string env)
        {
            string maskinportenEnvironment = env == "prod" ? "prod" : "test";
            if (!_maskinportenIntegrationSettings.TryGetValue(maskinportenEnvironment, out MaskinportenClientSettings maskinportenClientSettings))
            {
                throw new ArgumentException($"Invalid environment. Missing Maskinporten config for {env}");
            }

            return maskinportenClientSettings;
        }
    }
}
