using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Designer.Services.Models;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.TypedHttpClients.AltinnStorage
{
    /// <summary>
    /// AltinnStorageAppMetadataClient
    /// </summary>
    public class AltinnStorageAppMetadataClient : IAltinnStorageAppMetadataClient
    {
        private readonly HttpClient _httpClient;
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">HttpClient</param>
        /// <param name="options">IOptionsMonitor of type PlatformSettings</param>
        public AltinnStorageAppMetadataClient(
            HttpClient httpClient,
            IOptionsMonitor<PlatformSettings> options)
        {
            _httpClient = httpClient;
            _platformSettings = options.CurrentValue;
        }

        /// <inheritdoc />
        public async Task<Application> GetApplicationMetadata(string org, string app, EnvironmentModel environmentModel)
        {
            Uri uri = new Uri($"{CreateUri(environmentModel)}{org}/{app}");
            /*
             * Have to create a HttpRequestMessage instead of using helper extension methods like _httpClient.PostAsync(...)
             * because the base address can change on each request and after HttpClient gets initial base address,
             * it is not advised (and not allowed) to change base address.
             */
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, uri);
            HttpResponseMessage response = await _httpClient.SendAsync(request);
            return await response.Content.ReadAsAsync<Application>();
        }

        /// <inheritdoc />
        public async Task CreateApplicationMetadata(
            string org,
            string app,
            Application applicationMetadata,
            EnvironmentModel environmentModel)
        {
            Uri uri = new Uri($"{CreateUri(environmentModel)}?appId={org}/{app}");
            string stringContent = JsonSerializer.Serialize(applicationMetadata);
            /*
             * Have to create a HttpRequestMessage instead of using helper extension methods like _httpClient.PostAsync(...)
             * because the base address can change on each request and after HttpClient gets initial base address,
             * it is not advised (and not allowed) to change base address.
             */
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(stringContent, Encoding.UTF8, "application/json"),
            };
            await _httpClient.SendAsync(request);
        }

        /// <inheritdoc />
        public async Task UpdateApplicationMetadata(
            string org,
            string app,
            Application applicationMetadata,
            EnvironmentModel environmentModel)
        {
            Uri uri = new Uri($"{CreateUri(environmentModel)}{org}/{app}");
            string stringContent = JsonSerializer.Serialize(applicationMetadata);
            /*
             * Have to create a HttpRequestMessage instead of using helper extension methods like _httpClient.PostAsync(...)
             * because the base address can change on each request and after HttpClient gets initial base address,
             * it is not advised (and not allowed) to change base address.
             */
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Put, uri)
            {
                Content = new StringContent(stringContent, Encoding.UTF8, "application/json"),
            };
            await _httpClient.SendAsync(request);
        }

        private Uri CreateUri(EnvironmentModel environmentModel)
            => new Uri($"https://{environmentModel.PlatformPrefix}.{environmentModel.Hostname}/{_platformSettings.ApiStorageApplicationUri}");
    }
}
