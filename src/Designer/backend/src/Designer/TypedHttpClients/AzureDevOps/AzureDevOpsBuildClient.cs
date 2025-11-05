#nullable disable
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps
{
    /// <summary>
    /// Implementation of IAzureDevOpsService
    /// </summary>
    public class AzureDevOpsBuildClient : IAzureDevOpsBuildClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AzureDevOpsBuildClient> _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">System.Net.Http.HttpClient</param>
        /// <param name="logger">ILogger</param>
        public AzureDevOpsBuildClient(
            HttpClient httpClient,
            ILogger<AzureDevOpsBuildClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<Build> QueueAsync<T>(T buildParameters, int buildDefinitionId) where T : class
        {
            QueueBuildRequest queueBuildRequest = CreateBuildRequest(buildParameters, buildDefinitionId);
            return await SendRequest(queueBuildRequest);
        }

        /// <inheritdoc/>
        public async Task<BuildEntity> Get(string buildId)
        {
            string requestUri = $"build/builds/{buildId}?api-version=5.1";
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
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };

            return new QueueBuildRequest
            {
                DefinitionReference = new DefinitionReference
                {
                    Id = buildDefinitionId
                },
                Parameters = JsonSerializer.Serialize(buildParameters, serializerOptions)
            };
        }

        private async Task<Build> SendRequest(QueueBuildRequest queueBuildRequest)
        {
            string requestBody = JsonSerializer.Serialize(queueBuildRequest);
            using StringContent httpContent = new(requestBody, Encoding.UTF8, MediaTypeNames.Application.Json);
            string requestUri = "build/builds?api-version=5.1";
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
