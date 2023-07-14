using System.Collections.Generic;
using System.Net.Http;
using System;
using Altinn.Studio.Designer.Models;
using PolicyAdmin.Models;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Utils;
using System.IO;
using System.Xml;

namespace Altinn.Studio.Designer.TypedHttpClients.Altinn2Metadata
{
    public class Altinn2MetadataClient : IAltinn2MetadataClient
    {
        private readonly HttpClient _httpClient;

        public Altinn2MetadataClient(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<ServiceResource> GetServiceResourceFromService(string serviceCode, int serviceEditionCode)
        {
            // Temp location. Will be moved to CDN
            string url = $"https://at23.altinn.cloud/sblbridge/metadata/api/resourceregisterresource?serviceCode={serviceCode}&serviceEditionCode={serviceEditionCode}";

            ServiceResource serviceResource;

            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(url);
                string contentString = await response.Content.ReadAsStringAsync();
                serviceResource = System.Text.Json.JsonSerializer.Deserialize<ServiceResource>(contentString);
                return serviceResource;
            }
            catch (Exception ex)
            {
                throw new Exception($"Something went wrong when retrieving service resource", ex);
            }
        }

        public async Task<XacmlPolicy> GetXacmlPolicy(string serviceCode, int serviceEditionCode, string identifier)
        {
            string url = $"https://at23.altinn.cloud/sblbridge/authorization/api/resourcepolicyfile?serviceCode={serviceCode}&serviceEditionCode={serviceEditionCode}&identifier={identifier}";

            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(url);
                string contentString = await response.Content.ReadAsStringAsync();
                XacmlPolicy policy;
                using (XmlReader reader = XmlReader.Create(new StringReader(contentString)))
                {
                    policy = XacmlParser.ParseXacmlPolicy(reader);
                }

                return policy;
            }
            catch (Exception ex)
            {
                throw new Exception($"Something went wrong when retrieving service resource", ex);
            }

            return null;

        }

    }
}
