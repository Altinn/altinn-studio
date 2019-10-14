using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
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
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">System.Net.Http.HttpClient</param>
        /// <param name="generalSettingsOptions">IOptionsMonitor of Type GeneralSettings</param>
        public AzureDevOpsBuildService(
            HttpClient httpClient,
            IOptionsMonitor<GeneralSettings> generalSettingsOptions)
        {
            _generalSettings = generalSettingsOptions.CurrentValue;
            _httpClient = httpClient;
        }

        /// <inheritdoc/>
        public async Task<Build> QueueAsync(
            string commitId,
            string org,
            string app,
            string deployToken,
            int buildDefinitionId)
        {
            QueueBuildParameters queueBuildParameters = new QueueBuildParameters
            {
                AppCommitId = commitId,
                AppDeployToken = deployToken,
                AppOwner = org,
                AppRepo = app,
                GiteaEnvironment = $"{_generalSettings.HostName}/repos"
            };

            QueueBuildRequest queueBuildRequest = new QueueBuildRequest
            {
                DefinitionReference = new DefinitionReference
                {
                    Id = buildDefinitionId
                },
                Parameters = JsonConvert.SerializeObject(queueBuildParameters)
            };

            string requestBody = JsonConvert.SerializeObject(queueBuildRequest);
            StringContent httpContent = new StringContent(requestBody, Encoding.UTF8, "application/json");

            HttpResponseMessage response = await _httpClient.PostAsync("build/builds?api-version=5.1", httpContent);
            return await response.Content.ReadAsAsync<Build>();
        }
    }
}
