using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Services.Interfaces;
using AltinnCore.Designer.Services.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Rest.TransientFaultHandling;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Services
{
    /// <summary>
    /// Relevant application metadata functions
    /// </summary>
    public class ApplicationMetadataService : IApplicationMetadataService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IGitea _giteaApiWrapper;
        private readonly ILogger<ApplicationMetadataService> _logger;
        private readonly ServiceRepositorySettings _serviceRepositorySettings;
        private readonly PlatformSettings _platformSettings;
        private HttpClient _httpClient;
        private string _fullCommitSha;
        private string _org;
        private string _app;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClientFactory">IHttpClientFactory</param>
        /// <param name="giteaApiWrapper">IGitea</param>
        /// <param name="repositorySettings">IOptions of type ServiceRepositorySettings</param>
        /// <param name="logger">ILogger of type ApplicationMetadataService</param>
        public ApplicationMetadataService(
            IHttpClientFactory httpClientFactory,
            IGitea giteaApiWrapper,
            IOptions<ServiceRepositorySettings> repositorySettings,
            IOptions<PlatformSettings> platformSettings,
            ILogger<ApplicationMetadataService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _giteaApiWrapper = giteaApiWrapper;
            _logger = logger;
            _serviceRepositorySettings = repositorySettings.Value;
            _platformSettings = platformSettings.Value;
        }

        /// <inheritdoc />
        public async Task UpdateApplicationMetadataAsync(
            string org,
            string app,
            string fullCommitId,
            EnvironmentModel deploymentEnvironment)
        {
            _org = org;
            _app = app;
            _fullCommitSha = fullCommitId;
            _httpClient = GetHttpClientFromHttpClientFactory(deploymentEnvironment);

            Application applicationFromRepository = await GetApplicationMetadataFileFromRepository();
            Application application = await GetApplicationMetadataFromStorage();
            if (application == null)
            {
                await CreateApplicationMetadata(applicationFromRepository);
                return;
            }

            await UpdateApplicationMetadata(application, applicationFromRepository);
        }

        private HttpClient GetHttpClientFromHttpClientFactory(EnvironmentModel deploymentEnvironment)
        {
            HttpClient httpClient = _httpClientFactory.CreateClient(deploymentEnvironment.Hostname);
            string uri = $"https://{deploymentEnvironment.PlatformPrefix}.{deploymentEnvironment.Hostname}/{_platformSettings.ApiStorageApplicationUri}";
            httpClient.BaseAddress = new Uri(uri);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            return httpClient;
        }

        private async Task<Application> GetApplicationMetadataFileFromRepository()
        {
            string filePath = GetApplicationMetadataFilePath();
            string file = await _giteaApiWrapper.GetFileAsync(_org, _app, filePath);
            Application appMetadata = JsonConvert.DeserializeObject<Application>(file);

            return appMetadata;
        }

        private string GetApplicationMetadataFilePath()
        {
            const string configFolderPath = ServiceRepositorySettings.CONFIG_FOLDER_PATH;
            string applicationMetadataFileName = _serviceRepositorySettings.ApplicationMetadataFileName;
            return $"{_fullCommitSha}/{configFolderPath}{applicationMetadataFileName}";
        }

        private async Task<Application> GetApplicationMetadataFromStorage()
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"{_org}/{_app}");
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsAsync<Application>();
            }

            if (response.StatusCode != HttpStatusCode.NotFound)
            {
                throw new HttpRequestWithStatusException(response.ReasonPhrase)
                {
                    StatusCode = response.StatusCode
                };
            }

            return null;
        }

        private async Task CreateApplicationMetadata(Application applicationFromRepository)
        {
            Application appMetadata = new Application
            {
                Id = $"{_org}/{_app}",
                Org = applicationFromRepository.Org,
                CreatedBy = applicationFromRepository.CreatedBy,
                Created = applicationFromRepository.Created,
                DataTypes = applicationFromRepository.DataTypes,
                Title = applicationFromRepository.Title,
                PartyTypesAllowed = applicationFromRepository.PartyTypesAllowed,
                VersionId = _fullCommitSha
            };
            await _httpClient.PostAsJsonAsync($"?appId={_org}/{_app}", appMetadata);
        }

        private async Task UpdateApplicationMetadata(Application application, Application applicationFromRepository)
        {
            application.Title = applicationFromRepository.Title;
            application.VersionId = _fullCommitSha;
            application.DataTypes = applicationFromRepository.DataTypes;
            application.PartyTypesAllowed = applicationFromRepository.PartyTypesAllowed;
            await _httpClient.PutAsJsonAsync($"{_org}/{_app}", application);
        }
    }
}
