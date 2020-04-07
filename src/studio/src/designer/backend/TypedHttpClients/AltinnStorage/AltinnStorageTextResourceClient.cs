using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
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
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Constructor
        /// </summary>
        public AltinnStorageTextResourceClient(
            HttpClient httpClient,
            IOptionsMonitor<PlatformSettings> options)
        {
            _httpClient = httpClient;
            _platformSettings = options.CurrentValue;
        }

        /// <inheritdoc/>
        public async Task Create(string org, string app, TextResource textResource, EnvironmentModel environmentModel)
        {
            Uri uri = CreatePostUri(environmentModel, org, app);
            HttpClientHelper.AddSubscriptionKeys(_httpClient, uri, _platformSettings);
            string stringContent = JsonSerializer.Serialize(textResource);
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(stringContent, Encoding.UTF8, "application/json"),
            };
            await _httpClient.SendAsync(request);
        }

        /// <inheritdoc/>
        public async Task<TextResource> Get(string org, string app, string language, EnvironmentModel environmentModel)
        {
            Uri uri = CreateGetAndPutUri(environmentModel, org, app, language);
            HttpClientHelper.AddSubscriptionKeys(_httpClient, uri, _platformSettings);
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, uri);
            HttpResponseMessage response = await _httpClient.SendAsync(request);
            return await response.Content.ReadAsAsync<TextResource>();
        }

        /// <inheritdoc/>
        public async Task Update(string org, string app, TextResource textResource, EnvironmentModel environmentModel)
        {
            Uri uri = CreateGetAndPutUri(environmentModel, org, app, textResource.Language);
            HttpClientHelper.AddSubscriptionKeys(_httpClient, uri, _platformSettings);
            string stringContent = JsonSerializer.Serialize(textResource);
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Put, uri)
            {
                Content = new StringContent(stringContent, Encoding.UTF8, "application/json"),
            };
            await _httpClient.SendAsync(request);
        }

        private Uri CreatePostUri(EnvironmentModel environmentModel, string org, string app)
        {
            return new Uri($"https://{environmentModel.PlatformPrefix}.{environmentModel.Hostname}/{_platformSettings.ApiStorageApplicationUri}{org}/{app}/texts");
        }

        private Uri CreateGetAndPutUri(EnvironmentModel environmentModel, string org, string app, string language)
        {
            return new Uri($"https://{environmentModel.PlatformPrefix}.{environmentModel.Hostname}/{_platformSettings.ApiStorageApplicationUri}{org}/{app}/texts/{language}");
        }
    }
}
