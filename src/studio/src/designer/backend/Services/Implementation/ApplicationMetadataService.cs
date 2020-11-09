using System;
using System.Net;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Rest.TransientFaultHandling;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Relevant application metadata functions
    /// </summary>
    public class ApplicationMetadataService : IApplicationMetadataService
    {
        private readonly IGitea _giteaApiWrapper;
        private readonly ILogger<ApplicationMetadataService> _logger;
        private readonly IAltinnStorageAppMetadataClient _storageAppMetadataClient;
        private readonly ServiceRepositorySettings _serviceRepositorySettings;
        private EnvironmentModel _deploymentEnvironment;
        private string _shortCommitId;
        private string _org;
        private string _app;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="giteaApiWrapper">IGitea</param>
        /// <param name="repositorySettings">IOptions of type ServiceRepositorySettings</param>
        /// <param name="logger">ILogger of type ApplicationMetadataService</param>
        /// <param name="storageAppMetadataClient">IAltinnStorageAppMetadataClient</param>
        public ApplicationMetadataService(
            IGitea giteaApiWrapper,
            IOptions<ServiceRepositorySettings> repositorySettings,
            ILogger<ApplicationMetadataService> logger,
            IAltinnStorageAppMetadataClient storageAppMetadataClient)
        {
            _giteaApiWrapper = giteaApiWrapper;
            _logger = logger;
            _storageAppMetadataClient = storageAppMetadataClient;
            _serviceRepositorySettings = repositorySettings.Value;
        }

        /// <inheritdoc />
        public async Task UpdateApplicationMetadataAsync(
            string org,
            string app,
            string shortCommitId,
            EnvironmentModel deploymentEnvironment)
        {
            _org = org;
            _app = app;
            _deploymentEnvironment = deploymentEnvironment;
            _shortCommitId = shortCommitId;

            Application applicationFromRepository = await GetApplicationMetadataFileFromRepository();
            Application application = await GetApplicationMetadataFromStorage();
            if (application == null)
            {
                await CreateApplicationMetadata(applicationFromRepository);
                return;
            }

            await UpdateApplicationMetadata(application, applicationFromRepository);
        }

        private async Task<Application> GetApplicationMetadataFileFromRepository()
        {
            string filePath = GetApplicationMetadataFilePath();
            FileSystemObject file = await _giteaApiWrapper.GetFileAsync(_org, _app, filePath, _shortCommitId);
            if (string.IsNullOrEmpty(file.Content))
            {
                throw new NotFoundHttpRequestException($"There is no file in {filePath}.");
            }

            byte[] data = Convert.FromBase64String(file.Content);
            Application appMetadata = data.Deserialize<Application>();

            return appMetadata;
        }

        private string GetApplicationMetadataFilePath()
        {
            const string configFolderPath = ServiceRepositorySettings.CONFIG_FOLDER_PATH;
            string applicationMetadataFileName = _serviceRepositorySettings.ApplicationMetadataFileName;
            return $"{configFolderPath}{applicationMetadataFileName}";
        }

        private async Task<Application> GetApplicationMetadataFromStorage()
        {
            try
            {
                return await _storageAppMetadataClient.GetApplicationMetadata(_org, _app, _deploymentEnvironment);
            }
            catch (HttpRequestWithStatusException e)
            {
                /*
                 * Special exception handling because we want to continue if the exception
                 * was caused by a 404 (NOT FOUND) HTTP status code.
                 */
                if (e.StatusCode == HttpStatusCode.NotFound)
                {
                    return null;
                }

                throw;
            }
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
                VersionId = _shortCommitId
            };
            await _storageAppMetadataClient.CreateApplicationMetadata(_org, _app, appMetadata, _deploymentEnvironment);
        }

        private async Task UpdateApplicationMetadata(Application application, Application applicationFromRepository)
        {
            application.Title = applicationFromRepository.Title;
            application.VersionId = _shortCommitId;
            application.DataTypes = applicationFromRepository.DataTypes;
            application.PartyTypesAllowed = applicationFromRepository.PartyTypesAllowed;
            await _storageAppMetadataClient.UpdateApplicationMetadata(_org, _app, application, _deploymentEnvironment);
        }
    }
}
