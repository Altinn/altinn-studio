using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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
        private readonly ILogger _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">System.Net.Http.HttpClient</param>
        /// <param name="generalSettingsOptions">IOptionsMonitor of Type GeneralSettings</param>
        /// <param name="sourceControl">ISourceControl</param>
        /// <param name="logger">The logger.</param>
        public AzureDevOpsBuildClient(
            HttpClient httpClient,
            IOptionsMonitor<GeneralSettings> generalSettingsOptions,
            ISourceControl sourceControl,
            ILogger<AzureDevOpsBuildClient> logger)
        {
            _generalSettings = generalSettingsOptions.CurrentValue;
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
        public async Task<Build> Get(string buildId)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"{buildId}?api-version=5.1");
            return await response.Content.ReadAsAsync<Build>();
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
            using StringContent httpContent = new StringContent(requestBody, Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _httpClient.PostAsync("?api-version=5.1", httpContent);
            _logger.LogInformation("hostname: " + _generalSettings.HostName); 
            _logger.LogInformation("requestbody: " + requestBody);
            _logger.LogInformation("responsecode: " + response.StatusCode);
            _logger.LogInformation("content: " + response.Content.ToString());
            return await response.Content.ReadAsAsync<Build>();
        }
    }
}
