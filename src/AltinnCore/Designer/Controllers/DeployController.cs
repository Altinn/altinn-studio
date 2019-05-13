using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.Models;
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
        private readonly PlatformStorageSettings _storage_settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="DeployController"/> class
        /// </summary>
        /// <param name="sourceControl">The source control service</param>
        /// <param name="configuration">The configuration service</param>
        /// <param name="giteaAPI">The gitea api service</param>
        /// <param name="logger">The logger</param>
        /// <param name="settings">The settings service</param>
        /// <param name="storage_settings">The storage settings</param>
        public DeployController(
            ISourceControl sourceControl,
            IConfiguration configuration,
            IGitea giteaAPI,
            ILogger<DeployController> logger,
            IOptions<ServiceRepositorySettings> settings,
            IOptions<PlatformStorageSettings> storage_settings)
        {
            _sourceControl = sourceControl;
            _configuration = configuration;
            _giteaAPI = giteaAPI;
            _logger = logger;
            _settings = settings.Value;
            _storage_settings = storage_settings.Value;
        }

        /// <summary>
        /// Start a new deployment
        /// </summary>
        /// <param name="applicationOwnerId">The Organization code for the application owner</param>
        /// <param name="applicationCode">The application code for the current service</param>
        /// <returns>The result of trying to start a new deployment</returns>
        [HttpPost]
        public async Task<IActionResult> StartDeployment(string applicationOwnerId, string applicationCode)
        {
            if (applicationOwnerId == null || applicationCode == null)
            {
                return BadRequest(new DeploymentStatus
                {
                    Success = false,
                    Message = "ApplicationOwnerId and applicationCode must be supplied",
                });
            }

            if (_configuration["AccessTokenDevOps"] == null)
            {
                ViewBag.ServiceUnavailable = true;
                return BadRequest(new DeploymentStatus
                {
                    Success = false,
                    Message = "Deployment failed: no access token",
                });
            }

            string credentials = _configuration["AccessTokenDevOps"];

            string result = string.Empty;
            Branch masterBranch = _giteaAPI.GetBranch(applicationOwnerId, applicationCode, "master").Result;
            if (masterBranch == null)
            {
                _logger.LogWarning($"Unable to fetch branch information for app owner {applicationOwnerId} and app {applicationCode}");
                return StatusCode(500, new DeploymentResponse
                {
                    Success = false,
                    Message = "Deployment failed: unable to find latest commit",
                });
            }

            // register application in platform storage
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    string applicationId = $"{applicationOwnerId}-{applicationCode}";
                    string versionId = $"{masterBranch.Commit.Id}";

                    string storageEndpoint = Environment.GetEnvironmentVariable("PlatformStorage__ApiEndPoint") ?? _storage_settings.ApiEndPoint;
                    ApplicationMetadataClient applicationMetadataClient = new ApplicationMetadataClient(client, storageEndpoint);

                    ApplicationMetadata application = null;
                    string message;

                    try
                    {                         
                        application = applicationMetadataClient.GetApplicationMetadata(applicationId);
                        message = $"updated from versionId {application.VersionId}";
                    }
                    catch (Exception)
                    {
                        application = applicationMetadataClient.CreateApplication(applicationId);
                        message = "created";
                    }                    

                    if (application != null)
                    { 
                        application.VersionId = versionId;

                        ApplicationMetadata updated = applicationMetadataClient.UpdateApplicationMetadata(application);

                        _logger.LogInformation($"Application Metadata for {applicationId} is {message}. New versionId is {versionId}.");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Unable to deploy app {applicationCode} for {applicationOwnerId} to Platform Storage: {ex}");
                return StatusCode(500, new DeploymentResponse
                {
                    Success = false,
                    Message = $"Deployment of Application Metadata to Platform Storage failed {ex}",
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
                        parameters = $"{{\"APP_OWNER\":\"{applicationOwnerId}\",\"APP_REPO\":\"{applicationCode}\",\"APP_DEPLOY_TOKEN\":\"{_sourceControl.GetDeployToken()}\",\"GITEA_ENVIRONMENT\":\"{giteaEnvironment}\", \"APP_COMMIT_ID\":\"{masterBranch.Commit.Id}\",\"should_deploy\":\"{true}\"}}\"",
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
                _logger.LogWarning($"Unable deploy app {applicationCode} for {applicationOwnerId} because {ex}");
                return StatusCode(500, new DeploymentResponse
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
            if (string.IsNullOrEmpty(org) || string.IsNullOrEmpty(service) || string.IsNullOrEmpty(buildId))
            {
                return BadRequest(new DeploymentStatus
                {
                    Success = false,
                    Message = "Org, service or buildId not supplied",
                });
            }

            BuildModel buildModel = null;
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

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
                return StatusCode(500, new DeploymentStatus
                {
                    Success = false,
                    Message = "Deployment failed " + ex,
                });
            }

            var deploymentSuccess = buildModel.Result != null && buildModel.Result.Equals("succeeded");

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
