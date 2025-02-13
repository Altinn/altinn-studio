using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage
{
    /// <summary>
    /// IAltinnStorageTextResourceClient implementation
    /// </summary>
    public class AltinnStorageTextResourceClient : IAltinnStorageTextResourceClient
    {
        private readonly HttpClient _httpClient;
        private readonly IEnvironmentsService _environmentsService;
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Constructor
        /// </summary>
        public AltinnStorageTextResourceClient(
            HttpClient httpClient,
            IEnvironmentsService environmentsService,
            PlatformSettings options)
        {
            _httpClient = httpClient;
            _environmentsService = environmentsService;
            _platformSettings = options;
        }

        /// <inheritdoc/>
        public async Task Upsert(string org, string app, TextResource textResource, string envName)
        {
            Uri uri = await CreatePostUri(envName, org, app);
            string stringContent = JsonSerializer.Serialize(textResource);
            using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(stringContent, Encoding.UTF8, "application/json"),
            };
            await _httpClient.SendAsync(request);
        }

        private async Task<Uri> CreatePostUri(string envName, string org, string app)
        {
            var platformUri = await _environmentsService.CreatePlatformUri(envName);
            return new Uri($"{platformUri}{_platformSettings.ApiStorageApplicationUri}{org}/{app}/texts");
        }
    }
}
