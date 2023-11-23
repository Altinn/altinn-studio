using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

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

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">System.Net.Http.HttpClient</param>
        /// <param name="generalSettingsOptions">GeneralSettings</param>
        /// <param name="sourceControl">ISourceControl</param>
        /// <param name="logger">ILogger</param>
        public AzureDevOpsBuildClient(
            HttpClient httpClient,
            GeneralSettings generalSettingsOptions,
            ISourceControl sourceControl,
            ILogger<AzureDevOpsBuildClient> logger)
        {
            _generalSettings = generalSettingsOptions;
            _httpClient = httpClient;
            _sourceControl = sourceControl;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<Build> QueueAsync(
            QueueBuildParameters queueBuildParameters,
            int buildDefinitionId)
        {
            queueBuildParameters.GiteaEnvironment = $"{_generalSettings.HostName}/repos";
            queueBuildParameters.AppDeployToken = await _sourceControl.GetDeployToken();
            queueBuildParameters.AltinnStudioHostname = _generalSettings.HostName;

            QueueBuildRequest queueBuildRequest = CreateBuildRequest(queueBuildParameters, buildDefinitionId);
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

        private static QueueBuildRequest CreateBuildRequest(QueueBuildParameters queueBuildParameters, int buildDefinitionId)
        {
            JsonSerializerSettings jsonSerializerSettings = new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore
            };

            return new QueueBuildRequest
            {
                DefinitionReference = new DefinitionReference
                {
                    Id = buildDefinitionId
                },
                Parameters = JsonConvert.SerializeObject(queueBuildParameters, jsonSerializerSettings)
            };
        }

        private async Task<Build> SendRequest(QueueBuildRequest queueBuildRequest)
        {
            string requestBody = JsonConvert.SerializeObject(queueBuildRequest);
            using StringContent httpContent = new(requestBody, Encoding.UTF8, "application/json");
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
