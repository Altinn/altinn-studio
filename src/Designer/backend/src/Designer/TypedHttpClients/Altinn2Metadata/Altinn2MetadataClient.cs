using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.ResourceRegistry.Core.Models.Altinn2;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.TypedHttpClients.Altinn2Metadata
{
    public class Altinn2MetadataClient : IAltinn2MetadataClient
    {
        private readonly HttpClient _httpClient;

        private readonly ResourceRegistryIntegrationSettings _rrs;
        public Altinn2MetadataClient(HttpClient httpClient, IOptions<ResourceRegistryIntegrationSettings> rrs)
        {
            _httpClient = httpClient;
            _rrs = rrs.Value;
        }

        public async Task<ServiceResource> GetServiceResourceFromService(string serviceCode, int serviceEditionCode, string environment)
        {
            string bridgeBaseUrl = GetSblBridgeUrl(environment);
            string url = $"{bridgeBaseUrl}metadata/api/resourceregisterresource?serviceCode={serviceCode}&serviceEditionCode={serviceEditionCode}";

            HttpResponseMessage response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string contentString = await response.Content.ReadAsStringAsync();
            ServiceResource serviceResource = System.Text.Json.JsonSerializer.Deserialize<ServiceResource>(contentString);
            return serviceResource;
        }

        public async Task<XacmlPolicy> GetXacmlPolicy(string serviceCode, int serviceEditionCode, string identifier, string environment)
        {
            string bridgeBaseUrl = GetSblBridgeUrl(environment);
            string url = $"{bridgeBaseUrl}authorization/api/resourcepolicyfile?serviceCode={serviceCode}&serviceEditionCode={serviceEditionCode}&identifier={identifier}";

            HttpResponseMessage response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string contentString = await response.Content.ReadAsStringAsync();
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(new StringReader(contentString)))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }

        public async Task<List<AvailableService>> AvailableServices(int languageId, string environment)
        {
            List<AvailableService> availableServices = null;
            string bridgeBaseUrl = GetSblBridgeUrl(environment);
            string availabbleServicePath = $"{bridgeBaseUrl}metadata/api/availableServices?languageID={languageId}&appTypesToInclude=0&includeExpired=false";

            HttpResponseMessage response = await _httpClient.GetAsync(availabbleServicePath);

            response.EnsureSuccessStatusCode();

            string availableServiceString = await response.Content.ReadAsStringAsync();
            if (!string.IsNullOrEmpty(availableServiceString))
            {
                availableServices = System.Text.Json.JsonSerializer.Deserialize<List<AvailableService>>(availableServiceString, new System.Text.Json.JsonSerializerOptions());
            }

            return availableServices;
        }

        private string GetSblBridgeUrl(string environment)
        {
            if (!_rrs.TryGetValue(environment.ToLower(), out ResourceRegistryEnvironmentSettings envSettings))
            {
                throw new ArgumentException($"Invalid environment. Missing environment config for {environment}");
            }

            return envSettings.SblBridgeBaseUrl;
        }
    }
}
