using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.ModelBinding;
using AltinnCore.RepositoryClient.Model;
using Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Implementation for deploy actions
    /// </summary>
    [Authorize]
    public class DeployController : Controller
    {
        private readonly ISourceControl _sourceControl;
        private IConfiguration _configuration;
        private readonly IGitea _giteaAPI;
        private ILogger<DeployController> _logger;
        private readonly ServiceRepositorySettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="DeployController"/> class
        /// </summary>
        /// <param name="sourceControl">The source control service</param>
        /// <param name="configuration">The configuration service</param>
        /// <param name="giteaAPI">The gitea api service</param>
        /// <param name="logger">The logger</param>
        /// <param name="settings">The settings service</param>
        public DeployController(
            ISourceControl sourceControl,
            IConfiguration configuration,
            IGitea giteaAPI,
            ILogger<DeployController> logger,
            IOptions<ServiceRepositorySettings> settings)
        {
            _sourceControl = sourceControl;
            _configuration = configuration;
            _giteaAPI = giteaAPI;
            _logger = logger;
            _settings = settings.Value;
        }

        /// <summary>
        /// Start a new deployment
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The result of trying to start a new deployment</returns>
        [HttpPost]
        public async Task<IActionResult> StartDeployment(string org, string service)
        {
            if (org == null || service == null)
            {
                return BadRequest(new DeploymentStatus
                {
                    Success = false,
                    Message = "Org or service not supplied",
                });
            }

            if (_configuration["AccessTokenDevOps"] == null)
            {
                ViewBag.ServiceUnavailable = true;
                return Ok(new DeploymentStatus
                {
                    Success = false,
                    Message = "Deployment unavailable",
                });
            }

            string credentials = _configuration["AccessTokenDevOps"];

            string result = string.Empty;
            Branch masterBranch = _giteaAPI.GetBranch(org, service, "master").Result;
            if (masterBranch == null)
            {
                _logger.LogWarning($"Unable to fetch branch information for app owner {org} and app {service}");
                return Ok(new DeploymentResponse
                {
                    Success = false,
                    Message = "Deployment failed: unable to find latest commit",
                });
            }

            try
            {
                using (HttpClient client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
                    string giteaEnvironment = Environment.GetEnvironmentVariable("GiteaEndpoint") ?? _settings.ApiEndPointHost;
                    object buildContent = new
                    {
                        definition = new
                        {
                            id = 5,
                        },
                        parameters = $"{{\"APP_OWNER\":\"{org}\",\"APP_REPO\":\"{service}\",\"APP_DEPLOY_TOKEN\":\"{_sourceControl.GetDeployToken()}\",\"GITEA_ENVIRONMENT\":\"{giteaEnvironment}\", \"APP_COMMIT_ID\":\"{masterBranch.Commit.Id}\",\"should_deploy\":\"{true}\"}}\"",
                    };

                    string buildjson = JsonConvert.SerializeObject(buildContent);
                    StringContent httpContent = new StringContent(buildjson, Encoding.UTF8, "application/json");
                    using (HttpResponseMessage response = await client.PostAsync("https://dev.azure.com/brreg/altinn-studio/_apis/build/builds?api-version=5.0-preview.4", httpContent))
                    {
                        response.EnsureSuccessStatusCode();
                        BuildModel responseBody = await response.Content.ReadAsAsync<BuildModel>();
                        result = responseBody.Id;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Unable deploy app {service} for {org} because {ex}");
                return Ok(new DeploymentResponse
                {
                    Success = false,
                    Message = "Deployment failed " + ex,
                });
            }

            return Ok(new DeploymentResponse
            {
                Success = true,
                BuildId = result,
                Message = "Deployment status: " + result,
            });
        }

        /// <summary>
        /// Gets deployment status
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="buildId">the id of the build for which the deployment status is to be retrieved</param>
        /// <returns>The build status of the deployment build</returns>
        [HttpGet]
        public async Task<IActionResult> FetchDeploymentStatus(string org, string service, string buildId)
        {
            if (org == null || service == null || buildId == null)
            {
                return BadRequest(new DeploymentStatus
                {
                    Success = false,
                    Message = "Org, service or buildId not supplied",
                });
            }

            string credentials = _configuration["AccessTokenDevOps"];
            if (credentials == null)
            {
                return Ok(new DeploymentStatus
                {
                    Success = false,
                    Message = "Deployment unavailable",
                });
            }

            BuildModel buildModel = null;
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

                    using (HttpResponseMessage response = await client.GetAsync(string.Format("https://dev.azure.com/brreg/altinn-studio/_apis/build/builds/{0}?api-version=5.0-preview.4", buildId)))
                    {
                        response.EnsureSuccessStatusCode();
                        buildModel = await response.Content.ReadAsAsync<BuildModel>();
                        string responseBody = await response.Content.ReadAsStringAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                return Ok(new DeploymentStatus
                {
                    Success = false,
                    Message = "Deployment failed " + ex,
                });
            }

            var deploymentSuccess = buildModel.Result.Equals("succeeded");

            return Ok(new DeploymentStatus
            {
                Success = deploymentSuccess,
                Message = "Deployment status: " + buildModel.Status,
                StartTime = buildModel.StartTime,
                FinishTime = buildModel.FinishTime,
                BuildId = buildId,
                Status = buildModel.Status,
            });
        }
    }
}
