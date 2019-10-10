using System.Net.Http;
using System.Threading.Tasks;
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

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">System.Net.Http.HttpClient</param>
        /// <param name="options">IOptionsMonitor</param>
        public AzureDevOpsBuildService(
            HttpClient httpClient,
            IOptionsMonitor<AzureDevOpsSettings> options)
        {
            _azureDevOpsSettings = options.CurrentValue;
            _httpClient = httpClient;
        }

        /// <inheritdoc/>
        public async Task<string> QueueAsync(
            string commitId,
            string org,
            string app,
            string deployToken)
        {
            var queueBuildParameters = new QueueBuildParameters
            {
                AppCommitId = commitId, // Find commit id with IGitea,
                AppDeployToken = deployToken, // Find app deploy token with ISourceControl,
                AppOwner = org, // perhaps use DI to get hold of org
                AppRepo = app, // perhaps use DI to get hold of app
                GiteaEnvironment = string.Empty, // Find a better solution than (Environment.GetEnvironmentVariable("GeneralSettings__HostName") ?? _settings.HostName) + "/repos";
            };
            var requestBody = new QueueBuildRequest
            {
                DefinitionReference = new DefinitionReference
                {
                    Id = _azureDevOpsSettings.BuildDefinitionId
                },
                Parameters = JsonConvert.SerializeObject(queueBuildParameters)
            };

            var response = await _httpClient.PostAsJsonAsync("/", requestBody);
        }
    }
}
