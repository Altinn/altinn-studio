using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps
{
    /// <summary>
    /// Implementation of IAzureDevOpsService
    /// </summary>
    public class AzureDevOpsBuildClient : IAzureDevOpsBuildClient
    {
        private readonly HttpClient _httpClient;
        private readonly GeneralSettings _generalSettings;
        private readonly ISourceControl _sourceControl;
        private readonly ILogger<AzureDevOpsBuildClient> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">System.Net.Http.HttpClient</param>
        /// <param name="generalSettingsOptions">GeneralSettings</param>
        /// <param name="sourceControl">ISourceControl</param>
        /// <param name="logger">ILogger</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        public AzureDevOpsBuildClient(
            HttpClient httpClient,
            GeneralSettings generalSettingsOptions,
            ISourceControl sourceControl,
            ILogger<AzureDevOpsBuildClient> logger, IHttpContextAccessor httpContextAccessor)
        {
            _generalSettings = generalSettingsOptions;
            _httpClient = httpClient;
            _sourceControl = sourceControl;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<Build> QueueAsync<T>(T buildParameters, int buildDefinitionId) where T : class
        {
            QueueBuildRequest queueBuildRequest = CreateBuildRequest(buildParameters, buildDefinitionId);
            return await SendRequest(queueBuildRequest);
        }

        /// <inheritdoc/>
        public async Task<BuildEntity> Get(string buildId)
        {
            string requestUri = $"{buildId}?api-version=5.1";
            _logger.LogInformation("Doing a request toward: {HttpClientBaseAddress}{RequestUri}", _httpClient.BaseAddress, requestUri);
            HttpResponseMessage response = await _httpClient.GetAsync(requestUri);
            response.EnsureSuccessStatusCode();
            Build build = await response.Content.ReadAsAsync<Build>();
            return ToBuildEntity(build);
        }

        private static QueueBuildRequest CreateBuildRequest<T>(T buildParameters, int buildDefinitionId) where T : class
        {
           JsonSerializerOptions serializerOptions = new()
            {
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            };

            return new QueueBuildRequest
            {
                DefinitionReference = new DefinitionReference
                {
                    Id = buildDefinitionId
                },
                Parameters =  JsonSerializer.Serialize(buildParameters, serializerOptions)
            };
        }

        private async Task<Build> SendRequest(QueueBuildRequest queueBuildRequest)
        {
            string requestBody = JsonSerializer.Serialize(queueBuildRequest);
            using StringContent httpContent = new(requestBody, Encoding.UTF8, MediaTypeNames.Application.Json);
            string requestUri = "?api-version=5.1";
            _logger.LogInformation("Doing a request toward: {HttpClientBaseAddress}{RequestUri}", _httpClient.BaseAddress, requestUri);

            HttpResponseMessage response = await _httpClient.PostAsync(requestUri, httpContent);
            return await response.Content.ReadAsAsync<Build>();
        }

        private static BuildEntity ToBuildEntity(Build build)
            => new()
            {
                Id = build.Id.ToString(),
                Status = build.Status,
                Result = build.Result,
                Started = build.StartTime,
                Finished = build.FinishTime
            };
    }
}
