using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using IdentityModel.OidcClient;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using PlatformStorageModels = Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the repository service needed for creating and updating apps in AltinnCore.
    /// </summary>
    public class RepositorySI : IRepository
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IGitea _gitea;
        private readonly ISourceControl _sourceControl;
        private readonly ILogger _logger;
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly IApplicationMetadataService _applicationMetadataService;
        private readonly ITextsService _textsService;

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositorySI"/> class
        /// </summary>
        /// <param name="repositorySettings">The settings for the app repository</param>
        /// <param name="generalSettings">The current general settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="gitea">gitea</param>
        /// <param name="sourceControl">the source control</param>
        /// <param name="logger">The logger</param>
        /// <param name="altinnGitRepositoryFactory">Factory class that knows how to create types of <see cref="AltinnGitRepository"/></param>
        /// <param name="applicationMetadataService">The service for handling the application metadata file</param>
        /// <param name="textsService">The service for handling texts</param>
        public RepositorySI(
            ServiceRepositorySettings repositorySettings,
            GeneralSettings generalSettings,
            IHttpContextAccessor httpContextAccessor,
            IGitea gitea,
            ISourceControl sourceControl,
            ILogger<RepositorySI> logger,
            IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
            IApplicationMetadataService applicationMetadataService,
            ITextsService textsService)
        {
            _settings = repositorySettings;
            _generalSettings = generalSettings;
            _httpContextAccessor = httpContextAccessor;
            _gitea = gitea;
            _sourceControl = sourceControl;
            _logger = logger;
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _applicationMetadataService = applicationMetadataService;
            _textsService = textsService;
        }

        /// <summary>
        /// Method that creates service metadata for a new app
        /// </summary>
        /// <param name="serviceMetadata">The <see cref="ModelMetadata"/></param>
        /// <returns>A boolean indicating if creation of service metadata went ok</returns>
        #region Service metadata
        public bool CreateServiceMetadata(ModelMetadata serviceMetadata)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            string orgPath = _settings.GetOrgPath(serviceMetadata.Org, developer);
            string appPath = Path.Combine(orgPath, serviceMetadata.RepositoryName);

            Directory.CreateDirectory(orgPath);
            Directory.CreateDirectory(appPath);

            // Creates all the files
            CopyFolderToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _generalSettings.DeploymentLocation, _settings.GetDeploymentFolderName());
            CopyFolderToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _generalSettings.AppLocation, _settings.GetAppFolderName());
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _settings.DockerfileFileName);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _settings.AppSlnFileName);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _settings.GitIgnoreFileName);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _settings.DockerIgnoreFileName);
            UpdateAuthorizationPolicyFile(serviceMetadata.Org, serviceMetadata.RepositoryName);
            return true;
        }

        /// <summary>
        /// Returns the <see cref="ModelMetadata"/> for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model metadata for an app.</returns>
        public async Task<ModelMetadata> GetModelMetadata(string org, string app)
        {
            string modelName = await GetModelName(org, app);
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string filename = _settings.GetMetadataPath(org, app, developer) + $"{modelName}.metadata.json";

            if (File.Exists(filename))
            {
                string filedata = File.ReadAllText(filename, Encoding.UTF8);
                return JsonConvert.DeserializeObject<ModelMetadata>(filedata);
            }

            return JsonConvert.DeserializeObject<ModelMetadata>("{ }");
        }

        #endregion

        /// <summary>
        /// Returns the content of a configuration file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name of the configuration</param>
        /// <returns>A string containing the file content</returns>
        public string GetConfiguration(string org, string app, string name)
        {
            string filename = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + name.AsFileName();
            string filedata = null;

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <summary>
        /// Returns the path to the app folder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A string containing the path</returns>
        public string GetAppPath(string org, string app)
        {
            return _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
        }

        /// <summary>
        /// Returns the app texts
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <remarks>
        /// Format of the dictionary is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// </remarks>
        /// <returns>The texts in a dictionary</returns>
        public Dictionary<string, Dictionary<string, TextResourceElement>> GetServiceTexts(string org, string app)
        {
            Dictionary<string, Dictionary<string, TextResourceElement>> appTextsAllLanguages = new();

            // Get app level text resources
            string resourcePath = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            appTextsAllLanguages = MergeResourceTexts(resourcePath, appTextsAllLanguages);

            // Get Org level text resources
            string orgResourcePath = _settings.GetOrgTextResourcePath(org, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            appTextsAllLanguages = MergeResourceTexts(orgResourcePath, appTextsAllLanguages);

            // Get Altinn common level text resources
            string commonResourcePath = _settings.GetCommonTextResourcePath(AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            appTextsAllLanguages = MergeResourceTexts(commonResourcePath, appTextsAllLanguages);

            return appTextsAllLanguages;
        }

        /// <summary>
        /// Merges the provided resource texts with the resource text in the the given path
        /// </summary>
        /// <param name="path">path for the resource files</param>
        /// <param name="resourceTexts">resource text dictionary</param>
        /// <remarks>
        /// Format of the dictionary is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// </remarks>
        /// <returns>resource texts</returns>
        private static Dictionary<string, Dictionary<string, TextResourceElement>> MergeResourceTexts(string path, Dictionary<string, Dictionary<string, TextResourceElement>> resourceTexts)
        {
            if (Directory.Exists(path))
            {
                string[] directoryFiles = Directory.GetFiles(path);

                foreach (string directoryFile in directoryFiles)
                {
                    string fileName = Path.GetFileName(directoryFile);
                    string[] nameParts = fileName.Split('.');
                    if (nameParts.Length == 3 && nameParts[0] == "resource" && nameParts[2] == "json")
                    {
                        string content = File.ReadAllText(directoryFile);
                        TextResource r = JsonConvert.DeserializeObject<TextResource>(content);
                        string culture = r.Language;

                        foreach (TextResourceElement resource in r.Resources)
                        {
                            string key = resource.Id;
                            string value = resource.Value;

                            if (key != null && value != null)
                            {
                                if (!resourceTexts.ContainsKey(key))
                                {
                                    resourceTexts.Add(key, new Dictionary<string, TextResourceElement>());
                                }

                                if (!resourceTexts[key].ContainsKey(culture))
                                {
                                    resourceTexts[key].Add(culture, resource);
                                }
                            }
                        }
                    }
                }
            }

            return resourceTexts;
        }

        /// <summary>
        /// Get the Json form model from disk for Dynamics
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetRuleHandler(string org, string app)
        {
            string filePath = _settings.GetRuleHandlerPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string fileData = null;

            if (File.Exists(filePath))
            {
                fileData = File.ReadAllText(filePath, Encoding.UTF8);
            }

            return fileData;
        }

        /// <summary>
        /// Get the Json file from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetRuleConfig(string org, string app)
        {
            string filePath = _settings.GetRuleConfigPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            if (File.Exists(filePath))
            {
                string fileData = File.ReadAllText(filePath, Encoding.UTF8);
                return fileData;
            }
            throw new FileNotFoundException("Rule configuration not found.");
        }

        /// <summary>
        /// Save rule handler file to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="content">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveRuleHandler(string org, string app, string content)
        {
            string filePath = _settings.GetRuleHandlerPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, content, Encoding.UTF8);

            return true;
        }

        /// <inheritdoc/>
        public string GetWidgetSettings(string org, string app)
        {
            string filePath = _settings.GetWidgetSettingsPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string fileData = null;
            if (File.Exists(filePath))
            {
                fileData = File.ReadAllText(filePath, Encoding.UTF8);
            }

            return fileData;
        }

        /// <summary>
        /// Save the Rules configuration JSON file to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveRuleConfig(string org, string app, string resource)
        {
            string filePath = _settings.GetRuleConfigPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, resource, Encoding.UTF8);

            return true;
        }

        /// <summary>
        /// Method that stores configuration to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name on config</param>
        /// <param name="config">The content</param>
        /// <returns>A boolean indicating if everything went ok</returns>
        public bool SaveConfiguration(string org, string app, string name, string config)
        {
            string filePath = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + name;
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, config, Encoding.UTF8);

            return true;
        }

        /// <summary>
        /// Method that stores contents of file path relative to root
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The name on config</param>
        /// <param name="fileContent">The content</param>
        /// <returns>A boolean indicating if everything went ok</returns>
        public bool SaveFile(string org, string app, string fileName, string fileContent)
        {
            string filePath = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            File.WriteAllText(filePath, fileContent, Encoding.UTF8);
            return true;
        }

        /// <summary>
        /// Deletes the language resource for a given language id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>A boolean indicating if the delete was a success</returns>
        public bool DeleteLanguage(string org, string app, string id)
        {
            string filename = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"resource.{id.AsFileName()}.json";
            bool deleted = false;

            if (File.Exists(filename))
            {
                File.Delete(filename);
                deleted = true;
            }

            return deleted;
        }

        /// <summary>
        ///  Updates application model with new app logic model
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="app">The app</param>
        /// <param name="dataTypeId">The dataTypeId for the new app logic datamodel</param>
        /// <param name="classRef">The class ref</param>
        public async Task UpdateApplicationWithAppLogicModel(string org, string app, string dataTypeId, string classRef)
        {
            PlatformStorageModels.Application application = await _applicationMetadataService.GetApplicationMetadataFromRepository(org, app);
            if (application.DataTypes == null)
            {
                application.DataTypes = new List<PlatformStorageModels.DataType>();
            }

            PlatformStorageModels.DataType existingLogicElement = application.DataTypes.FirstOrDefault(d => d.AppLogic != null);
            PlatformStorageModels.DataType logicElement = application.DataTypes.SingleOrDefault(d => d.Id == dataTypeId);

            if (logicElement == null)
            {
                logicElement = new PlatformStorageModels.DataType
                {
                    Id = dataTypeId,
                    TaskId = existingLogicElement == null ? "Task_1" : null,
                    AllowedContentTypes = new List<string>() { "application/xml" },
                    MaxCount = 1,
                    MinCount = 1,
                };
                application.DataTypes.Add(logicElement);
            }

            logicElement.AppLogic = new PlatformStorageModels.ApplicationLogic { AutoCreate = true, ClassRef = classRef };
            _applicationMetadataService.UpdateApplicationMetaDataLocally(org, app, application);
        }

        /// <summary>
        /// Creates a new app folder under the given <paramref name="org">org</paramref> and saves the
        /// given <paramref name="serviceConfig"/>
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="serviceConfig">The ServiceConfiguration to save</param>
        /// <returns>The repository created in gitea</returns>
        public async Task<RepositoryClient.Model.Repository> CreateService(string org, ServiceConfiguration serviceConfig)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string repoPath = _settings.GetServicePath(org, serviceConfig.RepositoryName, developer);
            var options = new CreateRepoOption(serviceConfig.RepositoryName);

            RepositoryClient.Model.Repository repository = await CreateRemoteRepository(org, options);

            if (repository != null && repository.RepositoryCreatedStatus == HttpStatusCode.Created)
            {
                if (Directory.Exists(repoPath))
                {
                    Directory.Delete(repoPath, true);
                }

                _sourceControl.CloneRemoteRepository(org, serviceConfig.RepositoryName);

                ModelMetadata metadata = new()
                {
                    Org = org,
                    ServiceName = serviceConfig.ServiceName,
                    RepositoryName = serviceConfig.RepositoryName,
                };

                // This creates all files
                CreateServiceMetadata(metadata);
                await _applicationMetadataService.CreateApplicationMetadata(org, serviceConfig.RepositoryName, serviceConfig.ServiceName);
                await _textsService.CreateLanguageResources(org, serviceConfig.RepositoryName, developer);
                await CreateRepositorySettings(org, serviceConfig.RepositoryName, developer);

                CommitInfo commitInfo = new() { Org = org, Repository = serviceConfig.RepositoryName, Message = "App created" };

                _sourceControl.PushChangesForRepository(commitInfo);
            }

            return repository;
        }

        private async Task CreateRepositorySettings(string org, string repository, string developer)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);
            var settings = new AltinnStudioSettings() { RepoType = AltinnRepositoryType.App };
            await altinnGitRepository.SaveAltinnStudioSettings(settings);
        }

        /// <inheritdoc/>
        public async Task<RepositoryClient.Model.Repository> CopyRepository(string org, string sourceRepository, string targetRepository, string developer)
        {
            var options = new CreateRepoOption(targetRepository);

            RepositoryClient.Model.Repository repository = await CreateRemoteRepository(org, options);

            if (repository == null || repository.RepositoryCreatedStatus != HttpStatusCode.Created)
            {
                return repository;
            }

            string targetRepositoryPath = _settings.GetServicePath(org, targetRepository, developer);

            if (Directory.Exists(targetRepositoryPath))
            {
                Directory.Delete(targetRepositoryPath, true);
            }

            _sourceControl.CloneRemoteRepository(org, sourceRepository, targetRepositoryPath);
            var targetAppRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);

            await targetAppRepository.SearchAndReplaceInFile(".git/config", $"repos/{org}/{sourceRepository}.git", $"repos/{org}/{targetRepository}.git");

            PlatformStorageModels.Application appMetadata = await targetAppRepository.GetApplicationMetadata();
            appMetadata.Id = $"{org}/{targetRepository}";
            appMetadata.CreatedBy = developer;
            appMetadata.LastChangedBy = developer;
            appMetadata.Created = DateTime.UtcNow;
            appMetadata.LastChanged = appMetadata.Created;
            await targetAppRepository.SaveApplicationMetadata(appMetadata);

            CommitInfo commitInfo = new() { Org = org, Repository = targetRepository, Message = $"App cloned from {sourceRepository} {DateTime.Now.Date.ToShortDateString()}" };
            _sourceControl.PushChangesForRepository(commitInfo);

            // Final changes are made in a seperate branch to be reviewed by developer
            string branchName = "complete_copy_of_app";
            string branchCloneName = $"{targetRepository}_{branchName}_{Guid.NewGuid()}";

            await _sourceControl.CreateBranch(org, targetRepository, branchName);
            _sourceControl.CloneRemoteRepository(org, targetRepository, _settings.GetServicePath(org, branchCloneName, developer), branchName);

            var branchAppRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, branchCloneName, developer);

            await branchAppRepository.SearchAndReplaceInFile("App/config/authorization/policy.xml", $"{sourceRepository}", $"{targetRepository}");

            _sourceControl.CommitAndPushChanges(org, targetRepository, branchName, branchAppRepository.RepositoryDirectory, "Updated policy.xml");
            await _sourceControl.CreatePullRequest(org, targetRepository, "master", branchName, "Auto-generated: Final changes for cloning app.");

            DirectoryHelper.DeleteFilesAndDirectory(branchAppRepository.RepositoryDirectory);

            return repository;
        }

        /// <summary>
        /// Deletes the local repository for the user and makes a new clone of the repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repositoryName">the name of the local repository to reset</param>
        /// <returns>True if the reset was successful, otherwise false.</returns>
        public bool ResetLocalRepository(string org, string repositoryName)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string repoPath = _settings.GetServicePath(org, repositoryName, developer);

            if (Directory.Exists(repoPath))
            {
                Directory.Delete(repoPath, true);
                _sourceControl.CloneRemoteRepository(org, repositoryName);
                return true;
            }

            return false;
        }

        /// <summary>
        /// create a repository in gitea for the given org and options
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="options">the options for creating a repository</param>
        /// <returns>The newly created repository</returns>
        public async Task<RepositoryClient.Model.Repository> CreateRemoteRepository(string org, CreateRepoOption options)
        {
            return await _gitea.CreateRepository(org, options);
        }

        /// <summary>
        /// Returns a list of files in the Implementation directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of file names</returns>
        public List<AltinnCoreFile> GetImplementationFiles(string org, string app)
        {
            List<AltinnCoreFile> coreFiles = new();

            string[] files = Directory.GetFiles(_settings.GetImplementationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
            foreach (string file in files)
            {
                AltinnCoreFile corefile = new()
                {
                    FilePath = file,
                    FileName = Path.GetFileName(file),
                    LastChanged = File.GetLastWriteTime(file),
                };

                coreFiles.Add(corefile);
            }

            string[] modelFiles;

            if (Directory.Exists(_settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext))))
            {
                modelFiles = Directory.GetFiles(_settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
                foreach (string file in modelFiles)
                {
                    AltinnCoreFile corefile = new()
                    {
                        FilePath = file,
                        FileName = Path.GetFileName(file),
                        LastChanged = File.GetLastWriteTime(file),
                    };

                    coreFiles.Add(corefile);
                }
            }

            string[] jsFiles = Directory.GetFiles(_settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
            foreach (string file in jsFiles)
            {
                if (Path.GetFileName(file) == _settings.RuleHandlerFileName)
                {
                    AltinnCoreFile corefile = new()
                    {
                        FilePath = file,
                        FileName = Path.GetFileName(file),
                        LastChanged = File.GetLastWriteTime(file),
                    };

                    coreFiles.Add(corefile);
                }
            }

            return coreFiles;
        }

        /// <summary>
        /// Returns a list of files in the Dynamics directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of file names</returns>
        public List<AltinnCoreFile> GetDynamicsFiles(string org, string app)
        {
            List<AltinnCoreFile> coreFiles = new();

            string rulehandlerPath = _settings.GetRuleHandlerPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            AltinnCoreFile ruleFile = new()
            {
                FilePath = rulehandlerPath,
                FileName = Path.GetFileName(rulehandlerPath),
                LastChanged = File.GetLastWriteTime(rulehandlerPath),
            };

            coreFiles.Add(ruleFile);

            return coreFiles;
        }

        /// <summary>
        /// Returns a list of files in the Calculation directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of file names</returns>
        public List<AltinnCoreFile> GetCalculationFiles(string org, string app)
        {
            List<AltinnCoreFile> coreFiles = new();

            string[] files = Directory.GetFiles(_settings.GetCalculationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
            foreach (string file in files)
            {
                AltinnCoreFile corefile = new()
                {
                    FilePath = file,
                    FileName = Path.GetFileName(file),
                    LastChanged = File.GetLastWriteTime(file),
                };

                coreFiles.Add(corefile);
            }

            return coreFiles;
        }

        /// <summary>
        /// Returns a list of the validation files in the Validation directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of file names</returns>
        public List<AltinnCoreFile> GetValidationFiles(string org, string app)
        {
            List<AltinnCoreFile> coreFiles = new();

            string[] files = Directory.GetFiles(_settings.GetValidationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
            foreach (string file in files)
            {
                AltinnCoreFile corefile = new()
                {
                    FilePath = file,
                    FileName = Path.GetFileName(file),
                    LastChanged = File.GetLastWriteTime(file),
                };

                coreFiles.Add(corefile);
            }

            return coreFiles;
        }

        /// <summary>
        /// Returns content of an app logic file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file name</param>
        /// <returns>Content of an implementation file</returns>
        public string GetAppLogic(string org, string app, string fileName)
        {
            string filename = _settings.GetAppLogicPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            string filedata = null;

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <summary>
        /// Saving an implementation file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file name</param>
        /// <param name="fileContent">The file content</param>
        public void SaveAppLogicFile(string org, string app, string fileName, string fileContent)
        {
            string filename = _settings.GetAppLogicPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            File.WriteAllText(filename, fileContent, Encoding.UTF8);
        }

        /// <summary>
        /// Create a new file in blob storage.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="repo">The repository</param>
        /// <param name="filepath">The filepath</param>
        /// <param name="stream">Data to be written to blob storage.</param>
        /// <returns>The size of the blob.</returns>
        public async Task WriteData(string org, string repo, string filepath, Stream stream)
        {
            string repopath = _settings.GetServicePath(org, repo, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            stream.Seek(0, SeekOrigin.Begin);
            using (FileStream outputFileStream = new(repopath + filepath, FileMode.Create))
            {
                await stream.CopyToAsync(outputFileStream);
                await outputFileStream.FlushAsync();
            }
        }

        /// <summary>
        /// Reads a data file from blob storage
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="repo">The repository</param>
        /// <param name="path">Path to be file to read blob storage.</param>
        /// <returns>The stream with the file</returns>
        public async Task<Stream> ReadData(string org, string repo, string path)
        {
            string repopath = _settings.GetServicePath(org, repo, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            Stream fs = File.OpenRead(repopath + path);
            return await Task.FromResult(fs);
        }

        /// <summary>
        /// Deletes the data element permanently
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="repo">The repository</param>
        /// <param name="path">Path to the file to delete.</param>
        public void DeleteData(string org, string repo, string path)
        {
            string repopath = _settings.GetServicePath(org, repo, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            File.Delete(repopath + path);
        }

        // IKKE SLETT
        private void UpdateAuthorizationPolicyFile(string org, string app)
        {
            // Read the authorization policy template (XACML file).
            string path = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string policyPath = Path.Combine(path, _generalSettings.AuthorizationPolicyTemplate);
            string authorizationPolicyData = File.ReadAllText(policyPath, Encoding.UTF8);

            File.WriteAllText(policyPath, authorizationPolicyData, Encoding.UTF8);
        }

        private void CopyFolderToApp(string org, string app, string sourcePath, string path)
        {
            string targetPath = Path.Combine(_settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)), path);

            // Create the app deployment folder
            Directory.CreateDirectory(targetPath);

            // Create all of the directories
            foreach (string dirPath in Directory.GetDirectories(sourcePath, "*", SearchOption.AllDirectories))
            {
                Directory.CreateDirectory(dirPath.Replace(sourcePath, targetPath));
            }

            // Copy all the files & Replaces any files with the same name
            foreach (string newPath in Directory.GetFiles(sourcePath, "*.*", SearchOption.AllDirectories))
            {
                File.Copy(newPath, newPath.Replace(sourcePath, targetPath), true);
            }
        }

        private void CopyFileToApp(string org, string app, string fileName)
        {
            string appPath = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            File.Copy($"{_generalSettings.TemplatePath}/{fileName}", Path.Combine(appPath, fileName));
        }

        /// <inheritdoc/>
        public List<FileSystemObject> GetContents(string org, string repository, string path = "")
        {
            List<FileSystemObject> contents = new();
            string repositoryPath = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string contentPath = Path.Combine(repositoryPath, path);

            // repository was not found
            if (!Directory.Exists(repositoryPath))
            {
                return null;
            }

            if (File.Exists(contentPath))
            {
                FileSystemObject f = GetFileSystemObjectForFile(contentPath);
                contents.Add(f);
            }
            else if (Directory.Exists(contentPath))
            {
                string[] dirs = Directory.GetDirectories(contentPath);
                foreach (string directoryPath in dirs)
                {
                    FileSystemObject d = GetFileSystemObjectForDirectory(directoryPath);
                    contents.Add(d);
                }

                string[] files = Directory.GetFiles(contentPath);
                foreach (string filePath in files)
                {
                    FileSystemObject f = GetFileSystemObjectForFile(filePath);
                    contents.Add(f);
                }
            }

            // setting all paths relative to repository
            contents.ForEach(c => c.Path = Path.GetRelativePath(repositoryPath, c.Path).Replace("\\", "/"));

            return contents;
        }

        public List<ServiceResource> GetServiceResources(string org, string repository, string path = "")
        {
            List<FileSystemObject> resourceFiles = GetResourceFiles(org, repository, path);
            List<ServiceResource> serviceResourceList = new List<ServiceResource>();
            string repopath = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            foreach (FileSystemObject resourceFile in resourceFiles)
            {
                string jsonString = File.ReadAllText($"{repopath}/{resourceFile.Path}");
                ServiceResource serviceResource = JsonConvert.DeserializeObject<ServiceResource>(jsonString);

                if (serviceResource != null)
                {
                    serviceResourceList.Add(serviceResource);
                }
            }

            return serviceResourceList;
        }

        public ActionResult<string> ValidateServiceResource(string org, string repository, string id, bool strictMode = false)
        {
            if (id != "")
            {
                ServiceResource resourceToValidate = GetServiceResourceById(org, repository, id);
                if (resourceToValidate != null)
                {
                    return ResourceAdminHelper.ValidateServiceResource(resourceToValidate);
                }

                return new StatusCodeResult(400);
            }
            else
            {
                List<ServiceResource> repositoryResourceList = GetServiceResources(org, repository);
                if (repositoryResourceList.Count > 0)
                {
                    return ResourceAdminHelper.ValidateServiceResource(repositoryResourceList.FirstOrDefault());
                }
                else
                {
                    return new StatusCodeResult(400);
                }
            }
        }

        public ActionResult UpdateServiceResource(string org, string id, ServiceResource updatedResource)
        {
            if (updatedResource != null && id == updatedResource.Identifier)
            {
                string repository = string.Format("{0}-resources", org);
                List<FileSystemObject> resourceFiles = GetResourceFiles(org, repository);
                string repopath = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

                foreach (FileSystemObject resourceFile in resourceFiles)
                {
                    string jsonString = File.ReadAllText($"{repopath}/{resourceFile.Path}");
                    ServiceResource serviceResource = JsonConvert.DeserializeObject<ServiceResource>(jsonString);

                    if (serviceResource != null && serviceResource.Identifier == updatedResource.Identifier)
                    {
                        string updatedResourceString = JsonConvert.SerializeObject(updatedResource);
                        File.WriteAllText($"{repopath}/{resourceFile.Path}", updatedResourceString);
                        return new StatusCodeResult(201);
                    }
                }
            }
            else
            {
                return new StatusCodeResult(400);
            }

            return new StatusCodeResult(403);
        }

        public ActionResult AddServiceResource(string org, ServiceResource newResource)
        {
            try
            {
                string repository = $"{org}-resources";
                if (!CheckIfResourceFileAlreadyExists(newResource.Identifier, org, repository))
                {
                    string repopath = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                    string fullPathOfNewResource = $"{repopath}\\{newResource.Identifier}_resource.json";
                    string newResourceJson = JsonConvert.SerializeObject(newResource);
                    File.WriteAllText(fullPathOfNewResource, newResourceJson);

                    return new StatusCodeResult(201);
                }
                else
                {
                    return new StatusCodeResult(409);
                }
            }
            catch (Exception)
            {
                return new StatusCodeResult(400);
            }
        }

        public bool CheckIfResourceFileAlreadyExists(string identifier, string org, string repository)
        {
            List<FileSystemObject> resourceFiles = GetResourceFiles(org, repository);
            foreach (var _ in from FileSystemObject resourceFile in resourceFiles
                              where resourceFile.Name.Contains(identifier)
                              select new { })
            {
                return true;
            }

            return false;
        }

        public ServiceResource GetServiceResourceById(string org, string repository, string identifier)
        {
            List<ServiceResource> resourcesInRepo = GetServiceResources(org, repository);
            return resourcesInRepo.Where(r => r.Identifier == identifier).FirstOrDefault();
        }

        private List<FileSystemObject> GetResourceFiles(string org, string repository, string path = "")
        {
            List<FileSystemObject> contents = GetContents(org, repository, path);
            List<FileSystemObject> resourceFiles = new List<FileSystemObject>();

            if (contents != null)
            {
                foreach (FileSystemObject resourceFile in contents)
                {
                    if (resourceFile.Name.EndsWith("_resource.json"))
                    {
                        resourceFiles.Add(resourceFile);
                    }
                }
            }

            return resourceFiles;
        }

        private FileSystemObject GetFileSystemObjectForFile(string path)
        {
            FileInfo fi = new(path);
            string encoding;

            using (StreamReader sr = new(path))
            {
                encoding = sr.CurrentEncoding.EncodingName;
            }

            FileSystemObject fso = new()
            {
                Type = FileSystemObjectType.File.ToString(),
                Name = fi.Name,
                Encoding = encoding,
                Path = fi.FullName,
            };

            return fso;
        }

        private FileSystemObject GetFileSystemObjectForDirectory(string path)
        {
            DirectoryInfo di = new(path);
            FileSystemObject fso = new()
            {
                Type = FileSystemObjectType.Dir.ToString(),
                Name = di.Name,
                Path = path,
                Content = null,
                Encoding = null
            };

            return fso;
        }

        private async Task<string> GetModelName(string org, string app)
        {
            PlatformStorageModels.Application application = await _applicationMetadataService.GetApplicationMetadataFromRepository(org, app);
            string dataTypeId = string.Empty;

            if (application == null)
            {
                return dataTypeId;
            }

            foreach (PlatformStorageModels.DataType data in application.DataTypes)
            {
                if (data.AppLogic != null && !string.IsNullOrEmpty(data.AppLogic.ClassRef))
                {
                    dataTypeId = data.Id;
                }
            }

            return dataTypeId;
        }

        /// <inheritdoc/>
        public async Task DeleteRepository(string org, string repository)
        {
            await _sourceControl.DeleteRepository(org, repository);
        }

        public bool SavePolicy(string org, string repo, string resourceId, XacmlPolicy xacmlPolicy)
        {
            string policyPath = GetPolicyPath(org, repo, resourceId);

            MemoryStream stream = new MemoryStream();
            XmlWriter writer = XmlWriter.Create(stream, new XmlWriterSettings() { Indent = true });

            XacmlSerializer.WritePolicy(writer, xacmlPolicy);

            writer.Flush();
            stream.Position = 0;

            using (var fs = new FileStream(policyPath, FileMode.OpenOrCreate))
            {
                stream.CopyTo(fs);
            }

            return true;
        }

        public XacmlPolicy GetPolicy(string org, string repo, string resourceId)
        {
            string policyPath = GetPolicyPath(org, repo, resourceId);
            XmlDocument policyDocument = new XmlDocument();
            policyDocument.Load(policyPath);
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }

        private string GetPolicyPath(string org, string repo, string resourceId)
        {
            string localRepoPath = _settings.GetServicePath(org, repo, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string policyPath = Path.Combine(localRepoPath, _generalSettings.AuthorizationPolicyTemplate);
            if (!string.IsNullOrEmpty(resourceId))
            {
                policyPath = Path.Combine(localRepoPath, resourceId, resourceId + "-policy.xml");
            }

            return policyPath;
        }
    }
}
