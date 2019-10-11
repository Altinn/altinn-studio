using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Designer.TypedHttpClients.AzureDevOps
{
    /// <summary>
    /// Implementation of IAzureDevOpsService
    /// </summary>
    public class AzureDevOpsBuildService : IAzureDevOpsBuildService
    {
        private readonly HttpClient _httpClient;
        private readonly AzureDevOpsSettings _azureDevOpsSettings;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">System.Net.Http.HttpClient</param>
        /// <param name="azureDevOpsOptions">IOptionsMonitor of Type AzureDevOpsSettings</param>
        /// <param name="generalSettingsOptions">IOptionsMonitor of Type GeneralSettings</param>
        public AzureDevOpsBuildService(
            HttpClient httpClient,
            IOptionsMonitor<AzureDevOpsSettings> azureDevOpsOptions,
            IOptionsMonitor<GeneralSettings> generalSettingsOptions)
        {
            _azureDevOpsSettings = azureDevOpsOptions.CurrentValue;
            _generalSettings = generalSettingsOptions.CurrentValue;
            _httpClient = httpClient;
        }

        /// <inheritdoc/>
        public async Task<Build> QueueAsync(
            string commitId,
            string org,
            string app,
            string deployToken)
        {
            var queueBuildParameters = new QueueBuildParameters
            {
                AppCommitId = commitId,
                AppDeployToken = deployToken,
                AppOwner = org,
                AppRepo = app,
                GiteaEnvironment = $"{_generalSettings.HostName}/repos"
            };

            var queueBuildRequest = new QueueBuildRequest
            {
                DefinitionReference = new DefinitionReference
                {
                    Id = _azureDevOpsSettings.BuildDefinitionId
                },
                Parameters = JsonConvert.SerializeObject(queueBuildParameters)
            };

            var requestBody = JsonConvert.SerializeObject(queueBuildRequest);
            StringContent httpContent = new StringContent(requestBody, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("build/builds?api-version=5.1", httpContent);
            return await response.Content.ReadAsAsync<Build>();
        }
    }
}
