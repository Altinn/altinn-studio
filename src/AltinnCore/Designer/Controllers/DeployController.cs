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
using Storage.Interface.Clients;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Implementation for deploy actions
    /// </summary>
    [Authorize]
    public class DeployController : Controller
    {
        private readonly ISourceControl _sourceControl;
        private readonly IConfiguration _configuration;
        private readonly IGitea _giteaAPI;
        private readonly ILogger<DeployController> _logger;
        private readonly ServiceRepositorySettings _settings;
        private readonly PlatformSettings _platformSettings;
        private readonly IRepository _repository;

        /// <summary>
        /// Initializes a new instance of the <see cref="DeployController"/> class
        /// </summary>
        /// <param name="sourceControl">The source control service</param>
        /// <param name="configuration">The configuration service</param>
        /// <param name="giteaAPI">The gitea api service</param>
        /// <param name="logger">The logger</param>
        /// <param name="settings">The settings service</param>
        /// <param name="platformSettings">The platform settings</param>
        /// <param name="repositoryService">the repository service</param>
        public DeployController(
            ISourceControl sourceControl,
            IConfiguration configuration,
            IGitea giteaAPI,
            ILogger<DeployController> logger,
            IOptions<ServiceRepositorySettings> settings,
            IOptions<PlatformSettings> platformSettings,
            IRepository repositoryService)
        {
            _sourceControl = sourceControl;
            _configuration = configuration;
            _giteaAPI = giteaAPI;
            _logger = logger;
            _settings = settings.Value;
            _platformSettings = platformSettings.Value;
            _repository = repositoryService;
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

            Repository repository = _giteaAPI.GetRepository(applicationOwnerId, applicationCode).Result;
            if (repository != null && repository.Permissions != null && repository.Permissions.Push != true)
            {
                ViewBag.ServiceUnavailable = true;
                return BadRequest(new DeploymentStatus
                {
                    Success = false,
                    Message = "Deployment failed: not authorized",
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
            bool applicationInStorage = await RegisterApplicationInStorage(applicationOwnerId, applicationCode, masterBranch.Commit.Id);
            if (!applicationInStorage)
            {
                _logger.LogWarning($"Unable to deploy app {applicationCode} for {applicationOwnerId} to Platform Storage");
                return StatusCode(500, new DeploymentResponse
                {
                    Success = false,
                    Message = $"Deployment of Application Metadata to Platform Storage failed",
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
                    _logger.LogInformation("response httpcontent - {0}", httpContent);
                    using (HttpResponseMessage response = await client.PostAsync("https://dev.azure.com/brreg/altinn-studio/_apis/build/builds?api-version=5.0-preview.4", httpContent))
                    {
                        response.EnsureSuccessStatusCode();
                        _logger.LogInformation("response content type - {0}", response.Content.Headers.ContentType);
                        _logger.LogInformation("response content - {0}", response.Content.ReadAsStringAsync().Result);
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
        /// <param name="applicationOwnerId">The Organization code for the application owner</param>
        /// <param name="applicationCode">The application code for the current service</param>
        /// <param name="buildId">the id of the build for which the deployment status is to be retrieved</param>
        /// <returns>The build status of the deployment build</returns>
        [HttpGet]
        public async Task<IActionResult> FetchDeploymentStatus(string applicationOwnerId, string applicationCode, string buildId)
        {
            if (string.IsNullOrEmpty(applicationOwnerId) || string.IsNullOrEmpty(applicationCode) || string.IsNullOrEmpty(buildId))
            {
                return BadRequest(new DeploymentStatus
                {
                    Success = false,
                    Message = "applicationOwnerId, applicationCode or buildId not supplied",
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

        private async Task<bool> RegisterApplicationInStorage(string applicationOwnerId, string applicationCode, string versionId)
        {
            bool applicationInStorage = false;
            ApplicationMetadata applicationMetadataFromRepository = _repository.GetApplicationMetadata(applicationOwnerId, applicationCode);
            using (HttpClient client = new HttpClient())
            {
                string applicationId = $"{applicationOwnerId}-{applicationCode}";
                string storageEndpoint = _platformSettings.GetApiStorageEndpoint;
                ApplicationMetadata application = null;
                string getApplicationMetadataUrl = $"{storageEndpoint}applications/{applicationId}";
                HttpResponseMessage getApplicationMetadataResponse = await client.GetAsync(getApplicationMetadataUrl);
                if (getApplicationMetadataResponse.IsSuccessStatusCode)
                {
                    string json = getApplicationMetadataResponse.Content.ReadAsStringAsync().Result;
                    application = JsonConvert.DeserializeObject<ApplicationMetadata>(json);
                    applicationInStorage = true;

                    if (application.Title == null)
                    {
                        application.Title = new Dictionary<string, string>();
                    }

                    application.Title = applicationMetadataFromRepository.Title;
                    application.VersionId = versionId;
                    if (application.Forms == null)
                    {
                        application.Forms = new List<ApplicationForm>();
                    }

                    application.Forms = applicationMetadataFromRepository.Forms;

                    HttpResponseMessage response = client.PutAsync(getApplicationMetadataUrl, application.AsJson()).Result;
                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation($"Application Metadata for {applicationId} is created. New versionId is {versionId}.");
                    }
                    else
                    {
                        _logger.LogInformation($"An error occured while trying to update application Metadata for {applicationId}. VersionId is {versionId}.");
                    }
                }
                else if (getApplicationMetadataResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    ApplicationMetadata appMetadata = GetApplicationMetadata(applicationId, versionId);
                    appMetadata.ApplicationOwnerId = applicationMetadataFromRepository.ApplicationOwnerId;
                    appMetadata.CreatedBy = applicationMetadataFromRepository.CreatedBy;
                    appMetadata.CreatedDateTime = applicationMetadataFromRepository.CreatedDateTime;
                    appMetadata.Forms = new List<ApplicationForm>();
                    appMetadata.Forms = applicationMetadataFromRepository.Forms;
                    appMetadata.Title = applicationMetadataFromRepository.Title;

                    string createApplicationMetadataUrl = $"{storageEndpoint}applications?applicationId={applicationId}";
                    HttpResponseMessage createApplicationMetadataResponse = await client.PostAsync(createApplicationMetadataUrl, appMetadata.AsJson());
                    if (createApplicationMetadataResponse.IsSuccessStatusCode)
                    {
                        applicationInStorage = true;
                    }
                    else
                    {
                        applicationInStorage = false;
                        _logger.LogError("Something went wrong when trying to create metadata, response code is: ", createApplicationMetadataResponse.StatusCode);
                    }
                }
                else
                {
                    applicationInStorage = false;
                    _logger.LogError("Something went wrong when trying to get metadata, response code is: ", getApplicationMetadataResponse.StatusCode);
                }

                return applicationInStorage;
            }
        }

        private ApplicationMetadata GetApplicationMetadata(string applicationId, string versionId)
        {
            Dictionary<string, string> title = new Dictionary<string, string>
                        {
                            { "nb", "Tittel" }
                        };

            ApplicationMetadata appMetadata = new ApplicationMetadata
            {
                Id = applicationId,
                Title = title,
                Forms = new List<ApplicationForm>(),
                VersionId = versionId
            };

            ApplicationForm defaultAppForm = new ApplicationForm
            {
                Id = "default",
                AllowedContentType = new List<string>() { "application/xml" }
            };

            appMetadata.Forms.Add(defaultAppForm);

            return appMetadata;
        }
    }
}
