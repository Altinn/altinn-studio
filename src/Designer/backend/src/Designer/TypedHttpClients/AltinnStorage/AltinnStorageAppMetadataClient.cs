using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;

using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage
{
    /// <summary>
    /// AltinnStorageAppMetadataClient
    /// </summary>
    public class AltinnStorageAppMetadataClient : IAltinnStorageAppMetadataClient
    {
        private readonly HttpClient _httpClient;
        private readonly IEnvironmentsService _environmentsService;
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger<AltinnStorageAppMetadataClient> _logger;

        private static readonly JsonSerializerOptions s_jsonOptions = new()
        {
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">HttpClient</param>
        /// <param name="environmentsService">EnvironmentsService</param>
        /// <param name="options">PlatformSettings</param>
        /// <param name="logger">Logger</param>
        public AltinnStorageAppMetadataClient(
            HttpClient httpClient,
            IEnvironmentsService environmentsService,
            PlatformSettings options,
            ILogger<AltinnStorageAppMetadataClient> logger)
        {
            _httpClient = httpClient;
            _environmentsService = environmentsService;
            _platformSettings = options;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task UpsertApplicationMetadata(
            string org,
            string app,
            ApplicationMetadata applicationMetadata,
            string envName)
        {
            string stringContent = JsonSerializer.Serialize(applicationMetadata);
            await UpsertApplicationMetadata(org, app, stringContent, envName);
        }

        /// <inheritdoc />
        public async Task UpsertApplicationMetadata(
            string org,
            string app,
            string applicationMetadataJson,
            string envName)
        {
            var storageUri = await CreateStorageUri(envName);
            Uri uri = new($"{storageUri}?appId={org}/{app}");
            /*
             * Have to create a HttpRequestMessage instead of using helper extension methods like _httpClient.PostAsync(...)
             * because the base address can change on each request and after HttpClient gets initial base address,
             * it is not advised (and not allowed) to change base address.
             */
            using HttpRequestMessage request = new(HttpMethod.Post, uri)
            {
                Content = new StringContent(applicationMetadataJson, Encoding.UTF8, "application/json"),
            };
            await _httpClient.SendAsync(request);
        }

        /// <inheritdoc />
        public async Task<ApplicationMetadata> GetApplicationMetadataAsync(
            AltinnRepoContext altinnRepoContext,
            string envName,
            CancellationToken cancellationToken = default)
        {
            string rawContent = await GetApplicationMetadataJsonAsync(altinnRepoContext, envName, cancellationToken);
            return JsonSerializer.Deserialize<ApplicationMetadata>(rawContent, s_jsonOptions);
        }

        /// <inheritdoc />
        public async Task<string> GetApplicationMetadataJsonAsync(
            AltinnRepoContext altinnRepoContext,
            string envName,
            CancellationToken cancellationToken = default)
        {
            Guard.AssertValidEnvironmentName(envName);

            var storageUri = await CreateStorageUri(envName);
            Uri uri = new($"{storageUri}{altinnRepoContext.Org}/{altinnRepoContext.Repo}");
            using HttpRequestMessage request = new(HttpMethod.Get, uri);
            using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);

            return await response.Content.ReadAsStringAsync(cancellationToken);
        }

        private async Task<Uri> CreateStorageUri(string envName)
        {
            var platformUri = await _environmentsService.CreatePlatformUri(envName);
            return new Uri($"{platformUri}{_platformSettings.ApiStorageApplicationUri}");
        }
    }
}
