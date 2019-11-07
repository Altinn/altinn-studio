using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Services.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Rest.TransientFaultHandling;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Services
{
    /// <summary>
    /// ApplicationMetadataService
    /// </summary>
    public class ApplicationMetadataService : IApplicationMetadataService
    {
        private readonly ILogger _logger;
        private readonly IRepository _repository;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IGitea _giteaApiWrapper;
        private readonly ISourceControl _sourceControl;
        private readonly ServiceRepositorySettings _serviceRepositorySettings;
        private HttpClient _httpClient;
        private string _commitId;
        private string _org;
        private string _app;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="logger">ILogger of type ApplicationMetadataService</param>
        /// <param name="repository">IRepository</param>
        /// <param name="httpClientFactory">IHttpClientFactory</param>
        /// <param name="giteaApiWrapper">IGitea</param>
        /// <param name="repositorySettings">IOptions of type ServiceRepositorySettings</param>
        public ApplicationMetadataService(
            ILogger<ApplicationMetadataService> logger,
            IRepository repository,
            IHttpClientFactory httpClientFactory,
            IGitea giteaApiWrapper,
            IOptions<ServiceRepositorySettings> repositorySettings)
        {
            _logger = logger;
            _repository = repository;
            _httpClientFactory = httpClientFactory;
            _giteaApiWrapper = giteaApiWrapper;
            _serviceRepositorySettings = repositorySettings.Value;
        }

        /// <inheritdoc />
        public async Task RegisterApplicationInStorageAsync(
            string org,
            string app,
            string commitId,
            EnvironmentModel deploymentEnvironment)
        {
            _org = org;
            _app = app;
            _commitId = commitId;
            _httpClient = GetHttpClientFromHttpClientFactory(deploymentEnvironment);

            Application applicationFromRepository = await GetOrCreateRepositoryAppForOldApps();
            Application application;
            try
            {
                application = await GetApplicationMetadataFromStorage();
            }
            catch (HttpRequestWithStatusException e) when (e.StatusCode == HttpStatusCode.NotFound)
            {
                _logger.LogError(e.Message);
                await CreateApplicationMetadata(applicationFromRepository);
                return;
            }

            await UpdateApplicationMetadata(application, applicationFromRepository);
        }

        private async Task<Application> GetOrCreateRepositoryAppForOldApps()
        {
            // TODO  Remove these calls when Gitea API has a better way to get the a specific file on a specific commit
            string filePath = await GetApplicationMetadataFilePath();
            string file = await _giteaApiWrapper.GetFileAsync(_org, _app, filePath);
            Application appMetadata = JsonConvert.DeserializeObject<Application>(file);

            return appMetadata;
        }

        private async Task<string> GetApplicationMetadataFilePath()
        {
            GitTreeStructure gitTree = await _giteaApiWrapper.GetGitTreeAsync(_org, _app, _commitId);
            const string metadataFolderName = ServiceRepositorySettings.METADATA_FOLDER_NAME;
            string applicationMetadataFileName = _serviceRepositorySettings.ApplicationMetadataFileName;
            return $"{gitTree.Sha}/{metadataFolderName}{applicationMetadataFileName}";
        }

        private HttpClient GetHttpClientFromHttpClientFactory(EnvironmentModel deploymentEnvironment)
        {
            var httpClient = _httpClientFactory.CreateClient(deploymentEnvironment.Hostname);
            var uri = $"https://{deploymentEnvironment.PlatformPrefix}.{deploymentEnvironment.Hostname}/storage/api/v1/applications/";
            httpClient.BaseAddress = new Uri(uri);

            return httpClient;
        }

        private async Task<Application> GetApplicationMetadataFromStorage()
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"{_org}/{_app}");
            return await response.Content.ReadAsAsync<Application>();
        }

        private async Task CreateApplicationMetadata(Application applicationFromRepository)
        {
            Application appMetadata = new Application
            {
                Id = $"{_org}/{_app}",
                Org = applicationFromRepository.Org,
                CreatedBy = applicationFromRepository.CreatedBy,
                CreatedDateTime = applicationFromRepository.CreatedDateTime,
                ElementTypes = applicationFromRepository.ElementTypes,
                Title = applicationFromRepository.Title,
                PartyTypesAllowed = applicationFromRepository.PartyTypesAllowed,
                VersionId = _commitId
            };
            await _httpClient.PostAsJsonAsync($"?appId={_org}/{_app}", appMetadata);
        }

        private async Task UpdateApplicationMetadata(Application application, Application applicationFromRepository)
        {
            application.Title = applicationFromRepository.Title;
            application.VersionId = _commitId;
            application.ElementTypes = applicationFromRepository.ElementTypes;
            application.PartyTypesAllowed = applicationFromRepository.PartyTypesAllowed;
            await _httpClient.PutAsJsonAsync($"{_org}/{_app}", application);
        }
    }
}
