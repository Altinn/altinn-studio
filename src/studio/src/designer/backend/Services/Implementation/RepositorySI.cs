using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;

using Manatee.Json.Schema;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using PlatformStorageModels = Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the repository service needed for creating and updating apps in AltinnCore.
    /// </summary>
    public class RepositorySI : Interfaces.IRepository
    {
        private readonly IDefaultFileFactory _defaultFileFactory;
        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IGitea _gitea;
        private readonly ISourceControl _sourceControl;
        private readonly ILoggerFactory _loggerFactory;
        private readonly ILogger _logger;
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositorySI"/> class
        /// </summary>
        /// <param name="repositorySettings">The settings for the app repository</param>
        /// <param name="generalSettings">The current general settings</param>
        /// <param name="defaultFileFactory">The default factory</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="gitea">gitea</param>
        /// <param name="sourceControl">the source control</param>
        /// <param name="loggerFactory">the logger factory</param>
        /// <param name="logger">The logger</param>
        /// <param name="altinnGitRepositoryFactory">Factory class that knows how to create types of <see cref="AltinnGitRepository"/></param>
        public RepositorySI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IOptions<GeneralSettings> generalSettings,
            IDefaultFileFactory defaultFileFactory,
            IHttpContextAccessor httpContextAccessor,
            IGitea gitea,
            ISourceControl sourceControl,
            ILoggerFactory loggerFactory,
            ILogger<RepositorySI> logger,
            IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _defaultFileFactory = defaultFileFactory;
            _settings = repositorySettings.Value;
            _generalSettings = generalSettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _gitea = gitea;
            _sourceControl = sourceControl;
            _loggerFactory = loggerFactory;
            _logger = logger;
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <summary>
        /// Method that creates service metadata for a new app
        /// </summary>
        /// <param name="serviceMetadata">The <see cref="ModelMetadata"/></param>
        /// <returns>A boolean indicating if creation of service metadata went ok</returns>
        #region Service metadata
        public bool CreateServiceMetadata(ModelMetadata serviceMetadata)
        {
            string developerUserName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            string orgPath = (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                ? Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + serviceMetadata.Org.AsFileName()
                : _settings.GetOrgPath(serviceMetadata.Org.AsFileName(), developerUserName);

            string appPath = $"{orgPath}/{serviceMetadata.RepositoryName.AsFileName()}";

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
        /// Creates the application metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation., e.g. "app-name-with-spaces".</param>
        /// <param name="appTitle">The application title in default language (nb), e.g. "App name with spaces"</param>
        public void CreateApplicationMetadata(string org, string app, string appTitle)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            PlatformStorageModels.Application appMetadata = new PlatformStorageModels.Application
            {
                Id = ApplicationHelper.GetFormattedApplicationId(org, app),
                VersionId = null,
                Org = org,
                Created = DateTime.UtcNow,
                CreatedBy = developer,
                LastChanged = DateTime.UtcNow,
                LastChangedBy = developer,
                Title = new Dictionary<string, string> { { "nb", appTitle ?? app } },
                DataTypes = new List<PlatformStorageModels.DataType>
                {
                    new PlatformStorageModels.DataType
                    {
                        Id = "ref-data-as-pdf",
                        AllowedContentTypes = new List<string>() { "application/pdf" },
                    }
                },
                PartyTypesAllowed = new PlatformStorageModels.PartyTypesAllowed()
            };

            string metadata = JsonConvert.SerializeObject(appMetadata, Newtonsoft.Json.Formatting.Indented);
            string filePath = _settings.GetAppMetadataFilePath(org, app, developer);

            // This creates metadata
            File.WriteAllText(filePath, metadata, Encoding.UTF8);
        }

        /// <inheritdoc/>
        public bool UpdateApplication(string org, string app, PlatformStorageModels.Application applicationMetadata)
        {
            try
            {
                string applicationMetadataAsJson = JsonConvert.SerializeObject(applicationMetadata, Newtonsoft.Json.Formatting.Indented);
                string filePath = _settings.GetAppMetadataFilePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                File.WriteAllText(filePath, applicationMetadataAsJson, Encoding.UTF8);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when trying to update application metadata ", ex);
                return false;
            }
        }

        /// <inheritdoc/>
        public bool UpdateModelMetadata(string org, string app, ModelMetadata modelMetadata, string modelName)
        {
            try
            {
                string metadataAsJson = JsonConvert.SerializeObject(modelMetadata);
                string modelsFolderPath = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                string filePath = modelsFolderPath + $"{modelName}.metadata.json";

                Directory.CreateDirectory(modelsFolderPath);
                File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);
            }
            catch (Exception e)
            {
                _logger.LogInformation($"An error occurred when trying to store model metadata: {e.GetType()} : {e.Message}");
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public bool AddMetadataForAttachment(string org, string app, string applicationMetadata)
        {
            try
            {
                PlatformStorageModels.DataType formMetadata = JsonConvert.DeserializeObject<PlatformStorageModels.DataType>(applicationMetadata);
                formMetadata.TaskId = "Task_1";
                PlatformStorageModels.Application existingApplicationMetadata = GetApplication(org, app);
                existingApplicationMetadata.DataTypes.Add(formMetadata);

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata, Newtonsoft.Json.Formatting.Indented);
                string filePath = _settings.GetAppMetadataFilePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

                File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public bool UpdateMetadataForAttachment(string org, string app, string applicationMetadata)
        {
            try
            {
                dynamic attachmentMetadata = JsonConvert.DeserializeObject(applicationMetadata);
                string attachmentId = attachmentMetadata.GetValue("id").Value;
                PlatformStorageModels.Application existingApplicationMetadata = GetApplication(org, app);
                PlatformStorageModels.DataType applicationForm = existingApplicationMetadata.DataTypes.FirstOrDefault(m => m.Id == attachmentId) ?? new PlatformStorageModels.DataType();
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

                DeleteMetadataForAttachment(org, app, attachmentId);
                string metadataAsJson = JsonConvert.SerializeObject(applicationForm);
                AddMetadataForAttachment(org, app, metadataAsJson);
            }
            catch (Exception)
            {
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public bool DeleteMetadataForAttachment(string org, string app, string id)
        {
            try
            {
                PlatformStorageModels.Application existingApplicationMetadata = GetApplication(org, app);

                if (existingApplicationMetadata.DataTypes != null)
                {
                    PlatformStorageModels.DataType removeForm = existingApplicationMetadata.DataTypes.Find(m => m.Id == id);
                    existingApplicationMetadata.DataTypes.Remove(removeForm);
                }

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata, Newtonsoft.Json.Formatting.Indented);
                string filePath = _settings.GetAppMetadataFilePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

                File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Returns the <see cref="ModelMetadata"/> for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model metadata for an app.</returns>
        public ModelMetadata GetModelMetadata(string org, string app)
        {
            string modelName = GetModelName(org, app);

            string filename = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"{modelName}.metadata.json";

            if (File.Exists(filename))
            {
                string filedata = File.ReadAllText(filename, Encoding.UTF8);
                return JsonConvert.DeserializeObject<ModelMetadata>(filedata);
            }

            return JsonConvert.DeserializeObject<ModelMetadata>("{ }");
        }

        /// <inheritdoc/>
        public PlatformStorageModels.Application GetApplication(string org, string app)
        {
            string filedata = string.Empty;
            string filename = _settings.GetAppMetadataFilePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            try
            {
                if (File.Exists(filename))
                {
                    filedata = File.ReadAllText(filename, Encoding.UTF8);
                }

                return JsonConvert.DeserializeObject<PlatformStorageModels.Application>(filedata);
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when fetching application metadata. {0}", ex);
                return null;
            }
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
        /// Returns the content of a file path relative to the app folder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The name of the configuration</param>
        /// <returns>A string containing the file content</returns>
        public string GetFileByRelativePath(string org, string app, string fileName)
        {
            string filename = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
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
        /// Get content of resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>The resource file content</returns>
        public string GetLanguageResource(string org, string app, string id)
        {
            string filename = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"resource.{id.AsFileName()}.json";
            string filedata = null;

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
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
            Dictionary<string, Dictionary<string, TextResourceElement>> appTextsAllLanguages =
                new Dictionary<string, Dictionary<string, TextResourceElement>>();

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
        /// Returns the app languages
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The text</returns>
        public List<string> GetLanguages(string org, string app)
        {
            List<string> languages = new List<string>();

            string resourcePath = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            if (!Directory.Exists(resourcePath))
            {
                Directory.CreateDirectory(resourcePath);
            }

            string[] directoryFiles = Directory.GetFiles(resourcePath, "resource.*.json");
            foreach (string directoryFile in directoryFiles)
            {
                string fileName = Path.GetFileName(directoryFile);
                string[] nameParts = fileName.Split('.');
                languages.Add(nameParts[1]);
            }

            return languages;
        }

        /// <summary>
        /// Save app texts to resource files
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="texts">The texts to be saved</param>
        public void SaveServiceTexts(string org, string app, Dictionary<string, Dictionary<string, TextResourceElement>> texts)
        {
            // Language, key, TextResourceElement
            Dictionary<string, Dictionary<string, TextResourceElement>> resourceTexts =
                new Dictionary<string, Dictionary<string, TextResourceElement>>();

            foreach (KeyValuePair<string, Dictionary<string, TextResourceElement>> text in texts)
            {
                string textResourceElementId = text.Key;
                foreach (KeyValuePair<string, TextResourceElement> localizedText in text.Value)
                {
                    string language = localizedText.Key;
                    TextResourceElement tre = localizedText.Value;
                    if (!resourceTexts.ContainsKey(language))
                    {
                        resourceTexts.Add(language, new Dictionary<string, TextResourceElement>());
                    }

                    if (!resourceTexts[language].ContainsKey(textResourceElementId))
                    {
                        resourceTexts[language].Add(textResourceElementId, new TextResourceElement { Id = textResourceElementId, Value = tre.Value, Variables = tre.Variables });
                    }
                }
            }

            string resourcePath = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            // loop through each language set of text resources
            foreach (KeyValuePair<string, Dictionary<string, TextResourceElement>> processedResource in resourceTexts)
            {
                TextResource tr = new TextResource();
                tr.Language = processedResource.Key;
                tr.Resources = new List<TextResourceElement>();

                foreach (KeyValuePair<string, TextResourceElement> actualResource in processedResource.Value)
                {
                    tr.Resources.Add(actualResource.Value);
                }

                string resourceString = JsonConvert.SerializeObject(tr, new JsonSerializerSettings { Formatting = Newtonsoft.Json.Formatting.Indented, NullValueHandling = NullValueHandling.Ignore });
                File.WriteAllText(resourcePath + $"/resource.{processedResource.Key}.json", resourceString);
            }
        }

        /// <summary>
        /// Get the XSD model from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the XSD object as a string</returns>
        public string GetXsdModel(string org, string app)
        {
            string modelName = GetModelName(org, app);
            string filename = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"{modelName}.xsd";
            string filedata = string.Empty;

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <summary>
        /// Get the Json Schema model from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the Json Schema object as a string</returns>
        public string GetJsonSchemaModel(string org, string app)
        {
            string modelName = GetModelName(org, app);
            string filename = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"{modelName}.schema.json";
            string filedata = null;

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <inheritdoc/>
        public string GetJsonFormLayouts(string org, string app)
        {
            Dictionary<string, object> layouts = new Dictionary<string, dynamic>();
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

            // If FormLayout.json exists in app/ui => move it to app/ui/layouts (for backwards comp)
            string filedata = string.Empty;
            string formLayoutPath = _settings.GetOldFormLayoutPath(org, app, developer);
            if (File.Exists(formLayoutPath))
            {
                filedata = File.ReadAllText(formLayoutPath, Encoding.UTF8);
                DeleteOldFormLayoutJson(org, app, developer);
                SaveFormLayout(org, app, "FormLayout", filedata);
            }

            string formLayoutsPath = _settings.GetFormLayoutsPath(org, app, developer);
            if (Directory.Exists(formLayoutsPath))
            {
                foreach (string file in Directory.GetFiles(formLayoutsPath))
                {
                    string data = File.ReadAllText(file, Encoding.UTF8);
                    string name = file.Replace(_settings.GetFormLayoutsPath(org, app, developer), string.Empty).Replace(".json", string.Empty);
                    layouts.Add(name, JsonConvert.DeserializeObject<object>(data));
                }
            }

            return JsonConvert.SerializeObject(layouts);
        }

        /// <summary>
        /// Get the Json third party components from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetJsonThirdPartyComponents(string org, string app)
        {
            string filePath = _settings.GetThirdPartyComponentsPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string fileData = null;

            if (File.Exists(filePath))
            {
                fileData = File.ReadAllText(filePath, Encoding.UTF8);
            }

            return fileData;
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
        /// Get the Json form model from disk for Calculation
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetCalculationHandler(string org, string app)
        {
            string filePath = _settings.GetCalculationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RuleHandlerFileName;
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
        /// <param name="fileName">The filename so read from</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetJsonFile(string org, string app, string fileName)
        {
            string filePath;

            if (fileName.Equals(_settings.GetRuleConfigFileName()))
            {
                filePath = _settings.GetRuleConfigPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            }
            else
            {
                filePath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            }

            string fileData = null;

            if (File.Exists(filePath))
            {
                fileData = File.ReadAllText(filePath, Encoding.UTF8);
            }

            return fileData;
        }

        /// <inheritdoc />
        public bool SaveFormLayout(string org, string app, string formLayout, string content)
        {
            string filePath = _settings.GetFormLayoutPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext), formLayout);
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, content, Encoding.UTF8);
            return true;
        }

        /// <inheritdoc />
        public bool UpdateFormLayoutName(string org, string app, string currentName, string newName)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string curFilePath = _settings.GetFormLayoutPath(org, app, developer, currentName);
            string newFilePath = _settings.GetFormLayoutPath(org, app, developer, newName);
            if (File.Exists(newFilePath) || !File.Exists(curFilePath))
            {
                return false;
            }

            File.Move(curFilePath, newFilePath);
            return true;
        }

        /// <inheritdoc />
        public bool DeleteFormLayout(string org, string app, string formLayout)
        {
            string filePath = _settings.GetFormLayoutPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext), formLayout);
            bool deleted = false;
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                deleted = true;
            }

            return deleted;
        }

        /// <inheritdoc />
        public bool SaveLayoutSettings(string org, string app, string setting)
        {
            string filePath = _settings.GetLayoutSettingPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, setting, Encoding.UTF8);
            return true;
        }

        /// <inheritdoc />
        public string GetLayoutSettings(string org, string app)
        {
            string filePath = _settings.GetLayoutSettingPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string filedata = null;
            if (File.Exists(filePath))
            {
                filedata = File.ReadAllText(filePath, Encoding.UTF8);
            }

            return filedata;
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

        /// <summary>
        /// Save the JSON third party components to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveJsonThirdPartyComponents(string org, string app, string resource)
        {
            string filePath = _settings.GetThirdPartyComponentsPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, resource, Encoding.UTF8);

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

        /// <inheritdoc/>
        public bool AddTextResources(string org, string app, List<TextResource> textResourcesList)
        {
            foreach (TextResource textResource in textResourcesList)
            {
                var currentResourceString = GetLanguageResource(org, app, textResource.Language);
                TextResource currentTextResource = JsonConvert.DeserializeObject<TextResource>(currentResourceString);
                var duplicateResources = textResource.Resources.FindAll(resource => currentTextResource.Resources.Find(r => r.Id == resource.Id) != null);
                if (duplicateResources.Count == 0)
                {
                    currentTextResource.Resources.AddRange(textResource.Resources);
                }
                else
                {
                    textResource.Resources.ForEach(resource =>
                    {
                        if (duplicateResources.Find(duplicate => duplicate.Id == resource.Id) != null)
                        {
                            var duplicate = currentTextResource.Resources.Find(r => r.Id == resource.Id);
                            duplicate.Value = resource.Value;
                            duplicate.Variables = resource.Variables;
                        }
                        else
                        {
                            currentTextResource.Resources.Add(resource);
                        }
                    });
                }

                SaveLanguageResource(org, app, textResource.Language, JsonConvert.SerializeObject(currentTextResource));
            }

            return true;
        }

        /// <summary>
        /// Save the JSON file to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The content of the resource file</param>
        /// <param name="fileName">The filename</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveJsonFile(string org, string app, string resource, string fileName)
        {
            string filePath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, resource, Encoding.UTF8);

            return true;
        }

        /// <summary>
        /// Save the Rules configuration JSON file to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveRuleConfigJson(string org, string app, string resource)
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
        /// Stores the resource for a given language id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb, en</code>)</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveLanguageResource(string org, string app, string id, string resource)
        {
            string filePath = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"resource.{id.AsFileName()}.json";
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, resource, Encoding.UTF8);

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
        /// Creates the model based on XSD
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="modelMetadata">The modelMetadata to generate the model based on</param>
        /// <param name="mainXsd">The main XSD for the current app</param>
        /// <param name="fileName">The name of the model metadata file.</param>
        /// <returns>A value indicating if everything went ok</returns>
        public bool CreateModel(string org, string app, ModelMetadata modelMetadata, XDocument mainXsd, string fileName)
        {
            JsonMetadataParser modelGenerator = new JsonMetadataParser();

            modelMetadata.Org = org;
            modelMetadata.RepositoryName = app;

            string classes = modelGenerator.CreateModelFromMetadata(modelMetadata);
            string root = modelMetadata.Elements != null && modelMetadata.Elements.Count > 0 ? modelMetadata.Elements.Values.First(e => e.ParentElement == null).TypeName : null;

            if (!UpdateModelMetadata(org, app, modelMetadata, fileName))
            {
                return false;
            }

            // Create the .cs file for the model
            try
            {
                string filePath = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName + ".cs";
                new FileInfo(filePath).Directory.Create();
                File.WriteAllText(filePath, classes, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            if (mainXsd != null)
            {
                string mainXsdString = mainXsd.ToString();

                // Create the .xsd file for the model
                try
                {
                    string filePath = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName + ".xsd";
                    new FileInfo(filePath).Directory.Create();
                    File.WriteAllText(filePath, mainXsdString, Encoding.UTF8);
                }
                catch (Exception)
                {
                    return false;
                }

                // Create the schema.json schema file for the model
                try
                {
                    XsdToJsonSchema xsdToJsonSchemaConverter;
                    using (MemoryStream memStream = new MemoryStream(Encoding.UTF8.GetBytes(mainXsdString)))
                    {
                        xsdToJsonSchemaConverter = new XsdToJsonSchema(XmlReader.Create(memStream), _loggerFactory.CreateLogger<XsdToJsonSchema>());
                    }

                    JsonSchema jsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

                    string filePath = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName + ".schema.json";
                    new FileInfo(filePath).Directory.Create();
                    File.WriteAllText(filePath, new Manatee.Json.Serialization.JsonSerializer().Serialize(jsonSchema).GetIndentedString(0), Encoding.UTF8);
                }
                catch (Exception)
                {
                    return false;
                }
            }

            // Update the ServiceImplementation class with the correct model type name
            UpdateApplicationWithAppLogicModel(org, app, fileName, "Altinn.App.Models." + root);

            return true;
        }

        /// <summary>
        ///  Updates application model with new app logic model
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="app">The app</param>
        /// <param name="dataTypeId">The dataTypeId for the new app logic datamodel</param>
        /// <param name="classRef">The class ref</param>
        public void UpdateApplicationWithAppLogicModel(string org, string app, string dataTypeId, string classRef)
        {
            PlatformStorageModels.Application application = GetApplication(org, app);
            if (application.DataTypes == null)
            {
                application.DataTypes = new List<PlatformStorageModels.DataType>();
            }

            PlatformStorageModels.DataType existingLogicElement = application.DataTypes.FirstOrDefault((d) => d.AppLogic != null);
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
            UpdateApplication(org, app, application);
        }

        /// <summary>
        /// Gets the content of the application model as string.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Application model content.</returns>
        public string GetAppModel(string org, string app)
        {
            string modelName = GetModelName(org, app);

            string filedata = string.Empty;
            string filename = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"{modelName}.cs";

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <summary>
        /// Returns a list of all organisations present in the local repository
        /// </summary>
        /// <returns>A list of all organisations</returns>
        public IList<OrgConfiguration> GetOwners()
        {
            List<OrgConfiguration> organisations = new List<OrgConfiguration>();

            string[] organisationDirectories = null;

            organisationDirectories = (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            ? Directory.GetDirectories(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation"))
            : Directory.GetDirectories(_settings.RepositoryLocation);

            foreach (string organisationDirectory in organisationDirectories)
            {
                string filename = organisationDirectory + "/" + Path.GetFileName(organisationDirectory) + "/config.json";
                if (File.Exists(filename))
                {
                    string textData = File.ReadAllText(filename);
                    organisations.Add(JsonConvert.DeserializeObject<OrgConfiguration>(textData));
                }
            }

            return organisations;
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
            string userName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string repoPath = _settings.GetServicePath(org, serviceConfig.RepositoryName, userName);
            var options = new RepositoryClient.Model.CreateRepoOption(serviceConfig.RepositoryName);

            RepositoryClient.Model.Repository repository = await CreateRemoteRepository(org, options);

            if (repository != null && repository.RepositoryCreatedStatus == System.Net.HttpStatusCode.Created)
            {
                if (Directory.Exists(repoPath))
                {
                    // "Soft-delete" of local repo folder with same name to make room for clone of the new repo
                    string backupPath = _settings.GetServicePath(org, $"{serviceConfig.RepositoryName}_REPLACED_BY_NEW_CLONE_{DateTime.Now.Ticks}", userName);
                    Directory.Move(repoPath, backupPath);
                }

                _sourceControl.CloneRemoteRepository(org, serviceConfig.RepositoryName);

                ModelMetadata metadata = new ModelMetadata
                {
                    Org = org,
                    ServiceName = serviceConfig.ServiceName,
                    RepositoryName = serviceConfig.RepositoryName,
                };

                // This creates all files
                CreateServiceMetadata(metadata);
                CreateApplicationMetadata(org, serviceConfig.RepositoryName, serviceConfig.ServiceName);
                CreateLanguageResources(org, serviceConfig);

                CommitInfo commitInfo = new CommitInfo() { Org = org, Repository = serviceConfig.RepositoryName, Message = "App created" };

                _sourceControl.PushChangesForRepository(commitInfo);
            }

            return repository;
        }

        private void CreateLanguageResources(string org, ServiceConfiguration serviceConfig)
        {
            if (!string.IsNullOrEmpty(serviceConfig.ServiceName))
            {
                // This creates the language resources file for nb
                JObject json = JObject.FromObject(new
                {
                    language = "nb",
                    resources = new[]
                    {
                        new { id = "ServiceName", value = serviceConfig.ServiceName }
                    },
                });

                SaveLanguageResource(org, serviceConfig.RepositoryName, "nb", json.ToString());
            }
        }

        /// <inheritdoc/>
        public async Task<RepositoryClient.Model.Repository> CopyRepository(string org, string sourceRepository, string targetRepository, string developer)
        {
            var options = new CreateRepoOption(targetRepository);

            RepositoryClient.Model.Repository repository = await CreateRemoteRepository(org, options);

            if (repository == null || repository.RepositoryCreatedStatus != System.Net.HttpStatusCode.Created)
            {
                return repository;
            }

            string targetRepositoryPath = _settings.GetServicePath(org, targetRepository, developer);

            if (Directory.Exists(targetRepositoryPath))
            {
                // "Soft-delete" of local repo folder with same name to make room for clone of the new repo
                string backupPath = _settings.GetServicePath(org, $"{targetRepository}_REPLACED_BY_NEW_CLONE_{DateTime.Now.Ticks}", developer);
                Directory.Move(targetRepositoryPath, backupPath);
            }

            _sourceControl.CloneRemoteRepository(org, sourceRepository, _settings.GetServicePath(org, targetRepository, developer));
            var targetAppRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);

            await targetAppRepository.SearchAndReplaceInFile(".git/config", $"repos/{org}/{sourceRepository}.git", $"repos/{org}/{targetRepository}.git");

            PlatformStorageModels.Application appMetadata = await targetAppRepository.GetApplicationMetadata();
            appMetadata.Id = $"{org}/{targetRepository}";
            appMetadata.CreatedBy = developer;
            appMetadata.LastChangedBy = developer;
            appMetadata.Created = DateTime.UtcNow;
            appMetadata.LastChanged = appMetadata.Created;
            await targetAppRepository.UpdateApplicationMetadata(appMetadata);

            CommitInfo commitInfo = new CommitInfo() { Org = org, Repository = targetRepository, Message = $"App cloned from {sourceRepository} {DateTime.Now.Date.ToShortDateString()}" };
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
            string userName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string repoPath = _settings.GetServicePath(org, repositoryName, userName);

            if (Directory.Exists(repoPath))
            {
                // "Soft-delete" of local repo folder with same name to make room for clone of the new repo
                string backupPath = _settings.GetServicePath(org, $"{repositoryName}_REPLACED_BY_NEW_CLONE_{DateTime.Now.Ticks}", userName);
                Directory.Move(repoPath, backupPath);
                _sourceControl.CloneRemoteRepository(org, repositoryName);
                return true;
            }

            return false;
        }

        /// <summary>
        /// Delete an app folder from disk.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>true if success, false otherwise</returns>
        public bool DeleteService(string org, string app)
        {
            try
            {
                string developerUserName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

                string directoryPath = null;

                org = org.AsFileName();
                app = app.AsFileName();

                directoryPath = (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                                ? $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}/{developerUserName}/{org}"
                                : $"{_settings.RepositoryLocation}/{developerUserName}/{org}";

                if (!string.IsNullOrEmpty(app))
                {
                    directoryPath += "/" + app;
                }
                else
                {
                    directoryPath += "/" + org;
                }

                DirectoryInfo directoryInfo = new DirectoryInfo(directoryPath);
                foreach (FileInfo file in directoryInfo.GetFiles())
                {
                    file.Delete();
                }

                foreach (DirectoryInfo directory in directoryInfo.GetDirectories())
                {
                    directory.Delete(true);
                }

                Directory.Delete(directoryPath, true);
            }
            catch (Exception)
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// create a repository in gitea for the given org and options
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="options">the options for creating a repository</param>
        /// <returns>The newly created repository</returns>
        public async Task<RepositoryClient.Model.Repository> CreateRemoteRepository(string org, Altinn.Studio.Designer.RepositoryClient.Model.CreateRepoOption options)
        {
            return await _gitea.CreateRepository(org, options);
        }

        /// <summary>
        /// Delete text resource
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name of the view</param>
        public void DeleteTextResource(string org, string app, string name)
        {
            Guard.AssertArgumentNotNullOrWhiteSpace(name, nameof(name));
            string resourceTextKey = ViewResourceKey(name);

            IEnumerable<ResourceWrapper> resources = GetAllResources(org, app);
            foreach (ResourceWrapper resource in resources)
            {
                ResourceCollection jsonFileContent = resource.Resources;
                List<Resource> itemsToDelete = jsonFileContent?.Resources.Where(v => resourceTextKey == v?.Id).ToList();

                if (itemsToDelete != null && itemsToDelete.Any())
                {
                    itemsToDelete.ForEach(r => jsonFileContent.Resources.Remove(r));
                    Save(resource);
                }
            }
        }

        /// <summary>
        /// Returns a list of files in the Implementation directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of file names</returns>
        public List<AltinnCoreFile> GetImplementationFiles(string org, string app)
        {
            List<AltinnCoreFile> coreFiles = new List<AltinnCoreFile>();

            string[] files = Directory.GetFiles(_settings.GetImplementationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
            foreach (string file in files)
            {
                AltinnCoreFile corefile = new AltinnCoreFile
                {
                    FilePath = file,
                    FileName = Path.GetFileName(file),
                    LastChanged = File.GetLastWriteTime(file),
                };

                coreFiles.Add(corefile);
            }

            string[] modelFiles = null;

            if (Directory.Exists(_settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext))))
            {
                modelFiles = Directory.GetFiles(_settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
                foreach (string file in modelFiles)
                {
                    AltinnCoreFile corefile = new AltinnCoreFile
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
                    AltinnCoreFile corefile = new AltinnCoreFile
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
            List<AltinnCoreFile> coreFiles = new List<AltinnCoreFile>();

            string rulehandlerPath = _settings.GetRuleHandlerPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            AltinnCoreFile ruleFile = new AltinnCoreFile
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
            List<AltinnCoreFile> coreFiles = new List<AltinnCoreFile>();

            string[] files = Directory.GetFiles(_settings.GetCalculationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
            foreach (string file in files)
            {
                AltinnCoreFile corefile = new AltinnCoreFile
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
            List<AltinnCoreFile> coreFiles = new List<AltinnCoreFile>();

            string[] files = Directory.GetFiles(_settings.GetValidationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
            foreach (string file in files)
            {
                AltinnCoreFile corefile = new AltinnCoreFile
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
        /// Returns content of a resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file Name</param>
        /// <returns>The file content</returns>
        public string GetResourceFile(string org, string app, string fileName)
        {
            string filename = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
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
        /// Saving a resouce file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The fileName</param>
        /// <param name="fileContent">The file content</param>
        public void SaveResourceFile(string org, string app, string fileName, string fileContent)
        {
            if (fileName.Contains(_settings.RuleHandlerFileName, StringComparison.OrdinalIgnoreCase))
            {
                string filename = _settings.GetRuleHandlerPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                File.WriteAllText(filename, fileContent, Encoding.UTF8);
            }
            else
            {
                string filename = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
                File.WriteAllText(filename, fileContent, Encoding.UTF8);
            }
        }

        /// <summary>
        /// Updates the view name text resource.
        /// "view." + viewName for each text resource in the app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="currentName">Current / old view name</param>
        /// <param name="newName">the new view name</param>
        public void UpdateViewNameTextResource(string org, string app, string currentName, string newName)
        {
            Guard.AssertArgumentNotNullOrWhiteSpace(currentName, nameof(currentName));
            Guard.AssertArgumentNotNullOrWhiteSpace(newName, nameof(newName));

            string currentKey = ViewResourceKey(currentName);
            string newKey = ViewResourceKey(newName);

            IEnumerable<ResourceWrapper> resources = GetAllResources(org, app);
            foreach (ResourceWrapper resource in resources)
            {
                List<Resource> itemsToUpdate = resource.FilterById(currentKey).ToList();
                if (itemsToUpdate.Any())
                {
                    itemsToUpdate.ForEach(r => r.Id = newKey);
                    Save(resource);
                }
                else if (!resource.FilterById(newKey).Any())
                {
                    resource.Resources.Add(newKey, string.Empty);
                    Save(resource);
                }
            }
        }

        /// <summary>
        /// Finds an app resource embedded in the app when running from local file folders
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The app resource file name</param>
        /// <returns>The app resource</returns>
        public byte[] GetServiceResource(string org, string app, string resource)
        {
            byte[] fileContent = null;

            if (resource == _settings.RuleHandlerFileName)
            {
                string dynamicsPath = _settings.GetDynamicsPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                if (File.Exists(dynamicsPath + resource))
                {
                    fileContent = File.ReadAllBytes(dynamicsPath + resource);
                }
            }
            else
            {
                string appResourceDirectoryPath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                if (File.Exists(appResourceDirectoryPath + resource))
                {
                    fileContent = File.ReadAllBytes(appResourceDirectoryPath + resource);
                }
            }

            return fileContent;
        }

        /// <inheritdoc/>
        public bool UpdateServiceInformationInApplication(string org, string app, ServiceConfiguration applicationInformation)
        {
            try
            {
                PlatformStorageModels.Application existingApplicationMetadata = GetApplication(org, app);

                if (existingApplicationMetadata.Title == null)
                {
                    existingApplicationMetadata.Title = new Dictionary<string, string>();
                }

                if (existingApplicationMetadata.Title.ContainsKey("nb"))
                {
                    existingApplicationMetadata.Title["nb"] = applicationInformation.ServiceName;
                }
                else
                {
                    existingApplicationMetadata.Title.Add("nb", applicationInformation.ServiceName);
                }

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata, Newtonsoft.Json.Formatting.Indented);
                string filePath = _settings.GetAppMetadataFilePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

                File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public bool UpdateAppTitle(string org, string app, string languageId, string title)
        {
            PlatformStorageModels.Application appMetadata = GetApplication(org, app);

            if (appMetadata == null)
            {
                return false;
            }

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

            return UpdateApplication(org, app, appMetadata);
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
            using (FileStream outputFileStream = new FileStream(repopath + filepath, FileMode.Create))
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

        private static string ViewResourceKey(string viewName)
        {
            return $"view.{viewName}";
        }

        private static void Save(ResourceWrapper resourceWrapper)
        {
            string textContent = JsonConvert.SerializeObject(resourceWrapper.Resources, Newtonsoft.Json.Formatting.Indented);
            File.WriteAllText(resourceWrapper.FileName, textContent);
        }

        // IKKE SLETT
        private void UpdateAuthorizationPolicyFile(string org, string app)
        {
            // Read the authorization policy template (XACML file).
            string path = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string policyPath = path + _generalSettings.AuthorizationPolicyTemplate;
            string authorizationPolicyData = File.ReadAllText(policyPath, Encoding.UTF8);

            // Replace "org" and "app" in the authorization policy file.
            authorizationPolicyData = authorizationPolicyData.Replace("[ORG]", org).Replace("[APP]", app);
            File.WriteAllText(policyPath, authorizationPolicyData, Encoding.UTF8);
        }

        private void CopyFolderToApp(string org, string app, string sourcePath, string path)
        {
            string targetPath = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + path;

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
            File.Copy($"{_generalSettings.TemplatePath}/{fileName}", appPath + fileName);
        }

        /// <summary>
        /// A dictionary, where the full filename is key, and the value is a deserialized ResourceCollection
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>IEnumerable loading the resources as you ask for next.</returns>
        private IEnumerable<ResourceWrapper> GetAllResources(string org, string app)
        {
            string resourcePath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string[] directoryFiles = Directory.GetFiles(resourcePath);

            foreach (string resourceFile in directoryFiles)
            {
                dynamic jsonFileContent = JsonConvert.DeserializeObject<ResourceCollection>(File.ReadAllText(resourceFile));
                yield return new ResourceWrapper { FileName = resourceFile, Resources = jsonFileContent };
            }
        }

        /// <inheritdoc/>
        public string GetPrefillJson(string org, string app, string dataModelName = "ServiceModel")
        {
            string filename = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + dataModelName + ".prefill.json";
            string filedata = null;
            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <inheritdoc/>
        public List<FileSystemObject> GetContents(string org, string repository, string path = "")
        {
            List<FileSystemObject> contents = new List<FileSystemObject>();
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

        private FileSystemObject GetFileSystemObjectForFile(string path)
        {
            FileInfo fi = new FileInfo(path);
            string encoding;

            using (StreamReader sr = new StreamReader(path))
            {
                encoding = sr.CurrentEncoding.EncodingName;
            }

            FileSystemObject fso = new FileSystemObject()
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
            DirectoryInfo di = new DirectoryInfo(path);
            FileSystemObject fso = new FileSystemObject()
            {
                Type = FileSystemObjectType.Dir.ToString(),
                Name = di.Name,
                Path = path,
                Content = null,
                Encoding = null
            };

            return fso;
        }

        private string GetModelName(string org, string app)
        {
            PlatformStorageModels.Application application = GetApplication(org, app);

            string dataTypeId = string.Empty;
            foreach (PlatformStorageModels.DataType data in application.DataTypes)
            {
                if (data.AppLogic != null && !string.IsNullOrEmpty(data.AppLogic.ClassRef))
                {
                    dataTypeId = data.Id;
                }
            }

            return dataTypeId;
        }

        private void DeleteOldFormLayoutJson(string org, string app, string developer)
        {
            string path = _settings.GetOldFormLayoutPath(org, app, developer);
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }

        /// <inheritdoc/>
        public async Task DeleteRepository(string org, string repository)
        {
            await _sourceControl.DeleteRepository(org, repository);
        }

        private class ResourceWrapper
        {
            public string FileName { get; set; }

            public ResourceCollection Resources { get; set; }

            public IEnumerable<Resource> FilterById(string id)
            {
                Guard.AssertArgumentNotNullOrWhiteSpace(id, nameof(id));
                return Resources?.Resources?.Where(r => id == r?.Id) ?? new Resource[0];
            }
        }
    }
}
