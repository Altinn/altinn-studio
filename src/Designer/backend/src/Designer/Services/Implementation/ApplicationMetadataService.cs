#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
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
        private readonly IGiteaClient _giteaClient;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="logger">ILogger of type ApplicationMetadataService</param>
        /// <param name="storageAppMetadataClient">IAltinnStorageAppMetadataClient</param>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="giteaClient">The gitea client</param>
        public ApplicationMetadataService(
            ILogger<ApplicationMetadataService> logger,
            IAltinnStorageAppMetadataClient storageAppMetadataClient,
            IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
            IHttpContextAccessor httpContextAccessor,
            IGiteaClient giteaClient)
        {
            _logger = logger;
            _storageAppMetadataClient = storageAppMetadataClient;
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _httpContextAccessor = httpContextAccessor;
            _giteaClient = giteaClient;
        }

        /// <inheritdoc/>
        public async Task UpdateAppTitleInAppMetadata(string org, string app, string languageId, string title)
        {
            ApplicationMetadata appMetadata = await GetApplicationMetadataFromRepository(org, app);

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
        public async Task UpdateApplicationMetaDataLocally(string org, string app, ApplicationMetadata applicationMetadata)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            await altinnAppGitRepository.SaveApplicationMetadata(applicationMetadata);
        }

        /// <inheritdic />
        public async Task<ServiceConfiguration> GetAppMetadataConfigAsync(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            try
            {
                ServiceConfiguration serviceConfiguration = await altinnAppGitRepository.GetAppMetadataConfig();
                return serviceConfiguration;
            }
            catch (FileNotFoundException)
            {
                ServiceConfiguration serviceConfiguration = new() { RepositoryName = app, ServiceName = app };
                return serviceConfiguration;
            }
        }

        /// <inheritdic />
        public async Task UpdateAppMetadataConfigAsync(string org, string app, ServiceConfiguration serviceConfiguration)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            await altinnAppGitRepository.SaveAppMetadataConfig(serviceConfiguration);
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
            string id = ApplicationHelper.GetFormattedApplicationId(org, app);
            ApplicationMetadata appMetadata = new(id)
            {
                Id = id,
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
                    },
                    new()
                    {
                        Id = "model",
                        AllowedContentTypes = new List<string>() { "application/xml" },
                        AppLogic = new ApplicationLogic()
                        {
                            AutoCreate = true,
                            ClassRef = "Altinn.App.Models.model.model",
                            AllowAnonymousOnStateless = false,
                            AutoDeleteOnProcessEnd = false
                        },
                        TaskId = "Task_1",
                        MaxCount = 1,
                        MinCount = 1,
                        EnablePdfCreation = true,
                        EnableFileScan = false,
                        ValidationErrorOnPendingFileScan = false
                    }
                },
                PartyTypesAllowed = new PartyTypesAllowed()
            };

            await UpdateApplicationMetaDataLocally(org, app, appMetadata);
        }

        /// <inheritdoc/>
        public async Task SetCoreProperties(string org, string app, string appTitle)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

            var appMetadata = await GetApplicationMetadataFromRepository(org, app);
            string id = ApplicationHelper.GetFormattedApplicationId(org, app);

            appMetadata.Org = org;
            appMetadata.Id = id;
            appMetadata.Title = new Dictionary<string, string> { { "nb", appTitle ?? app } };
            appMetadata.LastChanged = DateTime.UtcNow;
            appMetadata.LastChangedBy = developer;
            await UpdateApplicationMetaDataLocally(org, app, appMetadata);
        }

        /// <inheritdoc/>
        public async Task AddMetadataForAttachment(string org, string app, string applicationMetadata)
        {
            DataType formMetadata = JsonConvert.DeserializeObject<DataType>(applicationMetadata);
            ApplicationMetadata existingApplicationMetadata = await GetApplicationMetadataFromRepository(org, app);
            existingApplicationMetadata.DataTypes.Add(formMetadata);

            await UpdateApplicationMetaDataLocally(org, app, existingApplicationMetadata);
        }

        /// <inheritdoc/>
        public async Task UpdateMetadataForAttachment(string org, string app, string applicationMetadata)
        {
            dynamic attachmentMetadata = JsonConvert.DeserializeObject(applicationMetadata);
            string attachmentId = attachmentMetadata.GetValue("id").Value;
            ApplicationMetadata existingApplicationMetadata = await GetApplicationMetadataFromRepository(org, app);
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
                ApplicationMetadata existingApplicationMetadata = await GetApplicationMetadataFromRepository(org, app);

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
        public async Task UpdateApplicationMetadataInStorageAsync(string org, string app, string shortCommitId, string envName, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string appMetadataJson = await GetApplicationMetadataJsonFromSpecificReference(org, app, shortCommitId);
            await UpdateApplicationMetadataInStorage(org, app, appMetadataJson, envName, shortCommitId);
        }

        public async Task<ApplicationMetadata> GetApplicationMetadataFromRepository(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
            return applicationMetadata;
        }

        /// <summary>
        /// Returns the application metadata for an application on a specific commitId
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="referenceId">The name of the commit/branch/tag. Default the repository’s default branch</param>
        /// <returns>The application metadata for an application.</returns>
        private async Task<string> GetApplicationMetadataJsonFromSpecificReference(string org, string app, string referenceId)
        {
            var file = await _giteaClient.GetFileAsync(org, app, "App/config/applicationmetadata.json", referenceId);
            if (string.IsNullOrEmpty(file.Content))
            {
                throw new NotFoundHttpRequestException("There is no ApplicationMetadata file in repo.");
            }

            // Passing the file content through a MemoryStream to deal with potential BOM issues
            using var fileStream = new MemoryStream(Convert.FromBase64String(file.Content));
            using StreamReader utf8Reader = new(fileStream, Encoding.UTF8);
            return await utf8Reader.ReadToEndAsync();
        }

        public bool ApplicationMetadataExistsInRepository(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            return altinnAppGitRepository.ApplicationMetadataExists();
        }

        private async Task UpdateApplicationMetadataInStorage(string org, string app, string applicationMetadataJson, string envName, string shortCommitId)
        {
            applicationMetadataJson = ApplicationMetadataJsonHelper.SetId(applicationMetadataJson, id: $"{org}/{app}");
            applicationMetadataJson = ApplicationMetadataJsonHelper.SetVersionId(applicationMetadataJson, versionId: shortCommitId);

            await _storageAppMetadataClient.UpsertApplicationMetadata(org, app, applicationMetadataJson, envName);
        }
    }
}
