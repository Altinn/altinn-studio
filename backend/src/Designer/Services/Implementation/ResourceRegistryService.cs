using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class ResourceRegistryService : IResourceRegistry
    {
        private readonly HttpClient _httpClient;

        public ResourceRegistryService()
        {

        }

        public ResourceRegistryService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<ActionResult> PublishServiceResource(ServiceResource serviceResource)
        {
            string resourceRegistryUrl = $"resourceregistry/api/v1/resource";
            string serviceResourceString = JsonConvert.SerializeObject(serviceResource);
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
    }
}
