using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Options;

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
            IOptionsMonitor<PlatformSettings> options)
        {
            _httpClient = httpClient;
            _environmentsService = environmentsService;
            _platformSettings = options.CurrentValue;
        }

        /// <inheritdoc/>
        public async Task Create(string org, string app, TextResource textResource, string envName)
        {
            Uri uri = await CreatePostUri(envName, org, app);
            HttpClientHelper.AddSubscriptionKeys(_httpClient, uri, _platformSettings);
            string stringContent = JsonSerializer.Serialize(textResource);
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(stringContent, Encoding.UTF8, "application/json"),
            };
            await _httpClient.SendAsync(request);
        }

        /// <inheritdoc/>
        public async Task<TextResource> Get(string org, string app, string language, string envName)
        {
            Uri uri = await CreateGetAndPutUri(envName, org, app, language);
            HttpClientHelper.AddSubscriptionKeys(_httpClient, uri, _platformSettings);
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, uri);
            HttpResponseMessage response = await _httpClient.SendAsync(request);
            return await response.Content.ReadAsAsync<TextResource>();
        }

        /// <inheritdoc/>
        public async Task Update(string org, string app, TextResource textResource, string envName)
        {
            Uri uri = await CreateGetAndPutUri(envName, org, app, textResource.Language);
            HttpClientHelper.AddSubscriptionKeys(_httpClient, uri, _platformSettings);
            string stringContent = JsonSerializer.Serialize(textResource);
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Put, uri)
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

        private async Task<Uri> CreateGetAndPutUri(string envName, string org, string app, string language)
        {
            var platformUri = await _environmentsService.CreatePlatformUri(envName);
            return new Uri($"{platformUri}{_platformSettings.ApiStorageApplicationUri}{org}/{app}/texts/{language}");
        }
    }
}
