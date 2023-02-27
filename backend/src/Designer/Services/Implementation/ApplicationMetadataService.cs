using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Relevant application metadata functions
    /// </summary>
    public class ApplicationMetadataService : IApplicationMetadataService
    {
        private readonly ILogger<ApplicationMetadataService> _logger;
        private readonly IAltinnStorageAppMetadataClient _storageAppMetadataClient;
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="logger">ILogger of type ApplicationMetadataService</param>
        /// <param name="storageAppMetadataClient">IAltinnStorageAppMetadataClient</param>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
        /// <param name="httpContextAccessor">The http context accessor.</param>
        public ApplicationMetadataService(
            ILogger<ApplicationMetadataService> logger,
            IAltinnStorageAppMetadataClient storageAppMetadataClient,
            IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
            IHttpContextAccessor httpContextAccessor)
        {
            _logger = logger;
            _storageAppMetadataClient = storageAppMetadataClient;
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public async Task UpdateAppTitleInAppMetadata(string org, string app, string languageId, string title)
        {
            Application appMetadata = await GetApplicationMetadataFromRepository(org, app);

            Dictionary<string, string> titles = appMetadata.Title;
            if (titles.ContainsKey(languageId))
            {
                titles[languageId] = title;
            }
            else
            {
                titles.Add(languageId, title);
            }

            appMetadata.Title = titles;

            await UpdateApplicationMetaDataLocally(org, app, appMetadata);
        }

        /// <inheritdoc/>
        public async Task UpdateApplicationMetaDataLocally(string org, string app, Application applicationMetadata)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            await altinnAppGitRepository.SaveApplicationMetadata(applicationMetadata);
        }

        /// <summary>
        /// Creates the application metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation., e.g. "app-name-with-spaces".</param>
        /// <param name="appTitle">The application title in default language (nb), e.g. "App name with spaces"</param>
        public async Task CreateApplicationMetadata(string org, string app, string appTitle)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            Application appMetadata = new()
            {
                Id = ApplicationHelper.GetFormattedApplicationId(org, app),
                VersionId = null,
                Org = org,
                Created = DateTime.UtcNow,
                CreatedBy = developer,
                LastChanged = DateTime.UtcNow,
                LastChangedBy = developer,
                Title = new Dictionary<string, string> { { "nb", appTitle ?? app } },
                DataTypes = new List<DataType>
                {
                    new()
                    {
                        Id = "ref-data-as-pdf",
                        AllowedContentTypes = new List<string>() { "application/pdf" },
                    }
                },
                PartyTypesAllowed = new PartyTypesAllowed()
            };

            await UpdateApplicationMetaDataLocally(org, app, appMetadata);
        }

        /// <inheritdoc/>
        public async Task AddMetadataForAttachment(string org, string app, string applicationMetadata)
        {
            DataType formMetadata = JsonConvert.DeserializeObject<DataType>(applicationMetadata);
            formMetadata.TaskId = "Task_1";
            Application existingApplicationMetadata = await GetApplicationMetadataFromRepository(org, app);
            existingApplicationMetadata.DataTypes.Add(formMetadata);

            await UpdateApplicationMetaDataLocally(org, app, existingApplicationMetadata);
        }

        /// <inheritdoc/>
        public async Task UpdateMetadataForAttachment(string org, string app, string applicationMetadata)
        {
            dynamic attachmentMetadata = JsonConvert.DeserializeObject(applicationMetadata);
            string attachmentId = attachmentMetadata.GetValue("id").Value;
            Application existingApplicationMetadata = await GetApplicationMetadataFromRepository(org, app);
            DataType applicationForm = existingApplicationMetadata.DataTypes.FirstOrDefault(m => m.Id == attachmentId) ?? new DataType();
            applicationForm.AllowedContentTypes = new List<string>();

            if (attachmentMetadata.GetValue("fileType") != null)
            {
                string fileTypes = attachmentMetadata.GetValue("fileType").Value;
                string[] fileType = fileTypes.Split(",");

                foreach (string type in fileType)
                {
                    applicationForm.AllowedContentTypes.Add(MimeTypeMap.GetMimeType(type.Trim()));
                }
            }

            applicationForm.Id = attachmentMetadata.GetValue("id").Value;
            applicationForm.MaxCount = Convert.ToInt32(attachmentMetadata.GetValue("maxCount").Value);
            applicationForm.MinCount = Convert.ToInt32(attachmentMetadata.GetValue("minCount").Value);
            applicationForm.MaxSize = Convert.ToInt32(attachmentMetadata.GetValue("maxSize").Value);

            await DeleteMetadataForAttachment(org, app, attachmentId);
            string metadataAsJson = JsonConvert.SerializeObject(applicationForm);
            await AddMetadataForAttachment(org, app, metadataAsJson);
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteMetadataForAttachment(string org, string app, string id)
        {
            try
            {
                Application existingApplicationMetadata = await GetApplicationMetadataFromRepository(org, app);

                if (existingApplicationMetadata.DataTypes != null)
                {
                    DataType removeForm = existingApplicationMetadata.DataTypes.Find(m => m.Id == id);
                    existingApplicationMetadata.DataTypes.Remove(removeForm);
                }

                await UpdateApplicationMetaDataLocally(org, app, existingApplicationMetadata);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <inheritdoc />
        public async Task UpdateApplicationMetadataInStorageAsync(string org, string app, string shortCommitId, string envName)
        {

            Application applicationFromRepository = await GetApplicationMetadataFromRepository(org, app);
            Application application = await GetApplicationMetadataFromStorage(org, app, envName);
            if (application == null)
            {
                await CreateApplicationMetadataInStorage(org, app, applicationFromRepository, envName, shortCommitId);
                return;
            }

            await UpdateApplicationMetadataInStorage(org, app, applicationFromRepository, envName, shortCommitId);
        }

        public async Task<Application> GetApplicationMetadataFromRepository(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            Application applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
            return applicationMetadata;
        }

        private async Task<Application> GetApplicationMetadataFromStorage(string org, string app, string envName)
        {
            try
            {
                return await _storageAppMetadataClient.GetApplicationMetadata(org, app, envName);
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

        private async Task CreateApplicationMetadataInStorage(string org, string app, Application applicationFromRepository, string envName, string shortCommitId)
        {
            applicationFromRepository.Id = $"{org}/{app}";
            applicationFromRepository.VersionId = shortCommitId;

            await _storageAppMetadataClient.CreateApplicationMetadata(org, app, applicationFromRepository, envName);
        }

        private async Task UpdateApplicationMetadataInStorage(string org, string app, Application applicationFromRepository, string envName, string shortCommitId)
        {
            applicationFromRepository.VersionId = shortCommitId;

            await _storageAppMetadataClient.UpdateApplicationMetadata(org, app, applicationFromRepository, envName);
        }
    }
}
