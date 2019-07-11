using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
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
        private readonly GeneralSettings _settings;
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
            IOptions<GeneralSettings> settings,
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
        /// <param name="org">The Organization code for the application owner</param>
        /// <param name="appName">The application code for the current service</param>
        /// <returns>The result of trying to start a new deployment</returns>
        [HttpPost]
        public async Task<IActionResult> StartDeployment(string org, string appName)
        {
            if (org == null || appName == null)
            {
                return BadRequest(new DeploymentStatus
                {
                    Success = false,
                    Message = "Application owner (org) and application name must be supplied",
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

            Repository repository = _giteaAPI.GetRepository(org, appName).Result;

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
            Branch masterBranch = _giteaAPI.GetBranch(org, appName, "master").Result;
            if (masterBranch == null)
            {
                _logger.LogWarning($"Unable to fetch branch information for app owner {org} and app {appName}");
                return StatusCode(500, new DeploymentResponse
                {
                    Success = false,
                    Message = "Deployment failed: unable to find latest commit",
                });
            }

            // register application in platform storage
            bool applicationInStorage = await RegisterApplicationInStorage(org, appName, masterBranch.Commit.Id);
            if (!applicationInStorage)
            {
                _logger.LogWarning($"Unable to deploy app {appName} for {org} to Platform Storage");
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
                    string giteaEnvironment = (Environment.GetEnvironmentVariable("GeneralSettings__HostName") ?? _settings.HostName) + "/repos";
                    object buildContent = new
                    {
                        definition = new
                        {
                            id = 5,
                        },
                        parameters = $"{{\"APP_OWNER\":\"{org}\",\"APP_REPO\":\"{appName}\",\"APP_DEPLOY_TOKEN\":\"{_sourceControl.GetDeployToken()}\",\"GITEA_ENVIRONMENT\":\"{giteaEnvironment}\", \"APP_COMMIT_ID\":\"{masterBranch.Commit.Id}\",\"should_deploy\":\"{true}\"}}\"",
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
                _logger.LogWarning($"Unable deploy app {appName} for {org} because {ex}");
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
        /// <param name="org">The Organization code for the application owner</param>
        /// <param name="appName">The application code for the current service</param>
        /// <param name="buildId">the id of the build for which the deployment status is to be retrieved</param>
        /// <returns>The build status of the deployment build</returns>
        [HttpGet]
        public async Task<IActionResult> FetchDeploymentStatus(string org, string appName, string buildId)
        {
            if (string.IsNullOrEmpty(org) || string.IsNullOrEmpty(appName) || string.IsNullOrEmpty(buildId))
            {
                return BadRequest(new DeploymentStatus
                {
                    Success = false,
                    Message = "application owner (org), appName or buildId not supplied",
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

        private async Task<bool> RegisterApplicationInStorage(string org, string appName, string versionId)
        {
            bool applicationInStorage = false;

            Application applicationFromRepository = _repository.GetApplication(org, appName);

            // for old service application meta data file was not generated, so create the application meta data file
            // but the metadata for attachment will not be available on deployment
            if (applicationFromRepository == null)
            {
                _repository.CreateApplication(org, appName);
                applicationFromRepository = _repository.GetApplication(org, appName);
            }

            using (HttpClient client = new HttpClient())
            {
                string appId = $"{org}/{appName}";
                string storageEndpoint = _platformSettings.GetApiStorageEndpoint;
                _logger.LogInformation($"Client url {storageEndpoint}");

                Application application = null;
                string getApplicationMetadataUrl = $"{storageEndpoint}applications/{appId}";
                _logger.LogInformation($"Request endpoint: {getApplicationMetadataUrl}");
                HttpResponseMessage getApplicationResponse = await client.GetAsync(getApplicationMetadataUrl);
                if (getApplicationResponse.IsSuccessStatusCode)
                {
                    string json = getApplicationResponse.Content.ReadAsStringAsync().Result;
                    application = JsonConvert.DeserializeObject<Application>(json);
                    applicationInStorage = true;

                    if (application.Title == null)
                    {
                        application.Title = new Dictionary<string, string>();
                    }

                    application.Title = applicationFromRepository.Title;
                    application.VersionId = versionId;
                    if (application.ElementTypes == null)
                    {
                        application.ElementTypes = new List<ElementType>();
                    }

                    application.ElementTypes = applicationFromRepository.ElementTypes;

                    HttpResponseMessage response = client.PutAsync(getApplicationMetadataUrl, application.AsJson()).Result;
                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation($"Application Metadata for {appId} is created. New versionId is {versionId}.");
                    }
                    else
                    {
                        _logger.LogInformation($"An error occured while trying to update application Metadata for {appId}. VersionId is {versionId}.");
                    }
                }
                else if (getApplicationResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    Application appMetadata = CreateApplication(appId, versionId);
                    appMetadata.Org = applicationFromRepository.Org;
                    appMetadata.CreatedBy = applicationFromRepository.CreatedBy;
                    appMetadata.CreatedDateTime = applicationFromRepository.CreatedDateTime;
                    appMetadata.ElementTypes = applicationFromRepository.ElementTypes;
                    appMetadata.Title = applicationFromRepository.Title;

                    string createApplicationMetadataUrl = $"{storageEndpoint}applications?appId={appId}";
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
                    _logger.LogError("Something went wrong when trying to get metadata, response code is: ", getApplicationResponse.StatusCode);
                }

                return applicationInStorage;
            }
        }

        private Application CreateApplication(string appId, string versionId)
        {
            Dictionary<string, string> title = new Dictionary<string, string>
                        {
                            { "nb", "Tittel" }
                        };

            Application appMetadata = new Application
            {
                Id = appId,
                Title = title,
                ElementTypes = new List<ElementType>(),
                VersionId = versionId
            };

            ElementType elementTypes = new ElementType
            {
                Id = "default",
                AllowedContentType = new List<string>() { "application/xml" }
            };

            appMetadata.ElementTypes.Add(elementTypes);

            return appMetadata;
        }
    }
}
