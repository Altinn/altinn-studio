using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Helpers.Extensions;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.RepositoryClient.Model;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using LibGit2Sharp;
using Manatee.Json.Schema;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Common.Services.Implementation
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
        public RepositorySI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IOptions<GeneralSettings> generalSettings,
            IDefaultFileFactory defaultFileFactory,
            IHttpContextAccessor httpContextAccessor,
            IGitea gitea,
            ISourceControl sourceControl,
            ILoggerFactory loggerFactory,
            ILogger<RepositorySI> logger)
        {
            _defaultFileFactory = defaultFileFactory;
            _settings = repositorySettings.Value;
            _generalSettings = generalSettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _gitea = gitea;
            _sourceControl = sourceControl;
            _loggerFactory = loggerFactory;
            _logger = logger;
        }

        /// <summary>
        /// Method that creates service metadata for a new app
        /// </summary>
        /// <param name="serviceMetadata">The <see cref="ModelMetadata"/></param>
        /// <returns>A boolean indicating if creation of service metadata went ok</returns>
        #region Service metadata
        public bool CreateServiceMetadata(ModelMetadata serviceMetadata)
        {
            string orgPath = null;
            string developerUserName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            orgPath = (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                ? Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + serviceMetadata.Org.AsFileName()
                : _settings.GetOrgPath(serviceMetadata.Org.AsFileName(), developerUserName);

            string appPath = orgPath + "/" + serviceMetadata.RepositoryName.AsFileName();

            // Creates the directory for org?
            if (!Directory.Exists(orgPath))
            {
                Directory.CreateDirectory(orgPath);
            }

            // Creates the directory for app?
            if (!Directory.Exists(appPath))
            {
                Directory.CreateDirectory(appPath);
            }

            // Creates all the files
            CopyFolderToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _generalSettings.DeploymentLocation, _settings.GetDeploymentFolderName());
            CopyFolderToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _generalSettings.AppLocation, _settings.GetAppFolderName());
            CopyFolderToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _generalSettings.IntegrationTestsLocation, _settings.GetIntegrationTestsFolderName());
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _settings.AppSlnFileName);
            CopyFileToApp(serviceMetadata.Org, serviceMetadata.RepositoryName, _settings.GitIgnoreFileName);
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
            Application appMetadata = new Application
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
                    new DataType
                    {
                        Id = "default",
                        AllowedContentTypes = new List<string>() { "application/xml" },
                        AppLogic = new ApplicationLogic() { },
                        TaskId = "Task_1",
                        MaxCount = 1,
                        MinCount = 1,
                    },
                    new DataType
                    {
                        Id = "ref-data-as-pdf",
                        AllowedContentTypes = new List<string>() { "application/pdf" },
                        TaskId = "Task_1",
                        MaxCount = 1,
                        MinCount = 0,
                    }
                },
                PartyTypesAllowed = new PartyTypesAllowed()
            };

            string metadata = JsonConvert.SerializeObject(appMetadata);
            string filePath = _settings.GetAppMetadataFilePath(org, app, developer);

            // This creates metadata
            File.WriteAllText(filePath, metadata, Encoding.UTF8);
        }

        /// <inheritdoc/>
        public bool UpdateApplication(string org, string app, Application applicationMetadata)
        {
            try
            {
                string applicationMetadataAsJson = JsonConvert.SerializeObject(applicationMetadata);
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
                DataType formMetadata = JsonConvert.DeserializeObject<DataType>(applicationMetadata);
                formMetadata.TaskId = "Task_1";
                Application existingApplicationMetadata = GetApplication(org, app);
                existingApplicationMetadata.DataTypes.Add(formMetadata);

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata);
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
                string fileTypes = attachmentMetadata.GetValue("fileType") == null ? "all" : attachmentMetadata.GetValue("fileType").Value;
                string[] fileType = fileTypes.Split(",");
                DataType applicationForm = new DataType();
                if (applicationForm.AllowedContentTypes == null)
                {
                    applicationForm.AllowedContentTypes = new List<string>();
                }

                foreach (string type in fileType)
                {
                    applicationForm.AllowedContentTypes.Add(MimeTypeMap.GetMimeType(type));
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
                Application existingApplicationMetadata = GetApplication(org, app);

                if (existingApplicationMetadata.DataTypes != null)
                {
                    DataType removeForm = existingApplicationMetadata.DataTypes.Find(m => m.Id == id);
                    existingApplicationMetadata.DataTypes.Remove(removeForm);
                }

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata);
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
            string filedata = string.Empty;
            string filename = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"{modelName}.metadata.json";

            try
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
                return JsonConvert.DeserializeObject<ModelMetadata>(filedata);
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when fetching modelMetadata ", ex);
                return JsonConvert.DeserializeObject<ModelMetadata>("{ }");
            }
        }

        /// <inheritdoc/>
        public Application GetApplication(string org, string app)
        {
            string filedata = string.Empty;
            string filename = _settings.GetAppMetadataFilePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            try
            {
                if (File.Exists(filename))
                {
                    filedata = File.ReadAllText(filename, Encoding.UTF8);
                }

                return JsonConvert.DeserializeObject<Application>(filedata);
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
        /// <returns>The text</returns>
        public Dictionary<string, Dictionary<string, string>> GetServiceTexts(string org, string app)
        {
            Dictionary<string, Dictionary<string, string>> appTextsAllLanguages =
                new Dictionary<string, Dictionary<string, string>>();

            // Get app level text resources
            string resourcePath = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            appTextsAllLanguages = GetResourceTexts(resourcePath, appTextsAllLanguages);

            // Get Org level text resources
            string orgResourcePath = _settings.GetOrgTextResourcePath(org, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            appTextsAllLanguages = GetResourceTexts(orgResourcePath, appTextsAllLanguages);

            // Get Altinn common level text resources
            string commonResourcePath = _settings.GetCommonTextResourcePath(AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            appTextsAllLanguages = GetResourceTexts(commonResourcePath, appTextsAllLanguages);

            return appTextsAllLanguages;
        }

        /// <summary>
        /// retrieves resource text for the given path
        /// </summary>
        /// <param name="path">path for the resource files</param>
        /// <param name="resourceTexts">resource text dictionary</param>
        /// <returns>resource texts</returns>
        private Dictionary<string, Dictionary<string, string>> GetResourceTexts(string path, Dictionary<string, Dictionary<string, string>> resourceTexts)
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
                        JObject resourceFile = JObject.Parse(File.ReadAllText(directoryFile));
                        string culture = (string)resourceFile["language"];
                        foreach (JObject resource in resourceFile["resources"])
                        {
                            string key = (string)resource["id"];
                            string value = (string)resource["value"];

                            if (key != null && value != null)
                            {
                                if (!resourceTexts.ContainsKey(key))
                                {
                                    resourceTexts.Add(key, new Dictionary<string, string>());
                                }

                                if (!resourceTexts[key].ContainsKey(culture))
                                {
                                    resourceTexts[key].Add(culture, value);
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
        public void SaveServiceTexts(string org, string app, Dictionary<string, Dictionary<string, string>> texts)
        {
            // Language, key, value
            Dictionary<string, Dictionary<string, JObject>> resourceTextsAsJson =
                new Dictionary<string, Dictionary<string, JObject>>();

            foreach (KeyValuePair<string, Dictionary<string, string>> text in texts)
            {
                foreach (KeyValuePair<string, string> localizedText in text.Value)
                {
                    if (!resourceTextsAsJson.ContainsKey(localizedText.Key))
                    {
                        resourceTextsAsJson.Add(localizedText.Key, new Dictionary<string, JObject>());
                    }

                    if (!resourceTextsAsJson[localizedText.Key].ContainsKey(text.Key))
                    {
                        dynamic textObject = new JObject
                        {
                            new JProperty("id", text.Key),
                            new JProperty("value", localizedText.Value),
                        };
                        resourceTextsAsJson[localizedText.Key].Add(text.Key, textObject);
                    }
                }
            }

            string resourcePath = _settings.GetLanguageResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            foreach (KeyValuePair<string, Dictionary<string, JObject>> processedResource in resourceTextsAsJson)
            {
                JObject resourceObject = new JObject();
                string language = processedResource.Key;
                resourceObject.Add(new JProperty("language", language));
                JArray textsArray = new JArray();

                foreach (KeyValuePair<string, JObject> actualResource in processedResource.Value)
                {
                    textsArray.Add(actualResource.Value);
                }

                resourceObject.Add("resources", textsArray);
                File.WriteAllText(resourcePath + $"/resource.{processedResource.Key}.json", resourceObject.ToString());
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
            string filedata = null;

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

        /// <summary>
        /// Get the Json form model from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetJsonFormLayout(string org, string app)
        {
            string filePath = _settings.GetFormLayoutPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string fileData = null;

            if (File.Exists(filePath))
            {
                fileData = File.ReadAllText(filePath, Encoding.UTF8);
            }

            return fileData;
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

        /// <summary>
        /// Save the JSON form layout to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveJsonFormLayout(string org, string app, string resource)
        {
            string filePath = _settings.GetFormLayoutPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, resource, Encoding.UTF8);

            return true;
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
        /// Gets the raw content of a code list
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name of the code list to retrieve</param>
        /// <returns>Raw contents of a code list file</returns>
        public string GetCodelist(string org, string app, string name)
        {
            try
            {
                Dictionary<string, string> allCodelists = GetCodelists(org, app);

                if (!allCodelists.ContainsKey(name))
                {
                    return null;
                }

                return allCodelists[name];
            }
            catch
            {
                return null;
            }
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
            string filename = string.Format(_settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext))) + $"resource.{id.AsFileName()}.json";
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
        ///  This logic is limited to having one datamodel per app. Needs to be updated for expanded functionality
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="app">The app</param>
        /// <param name="dataTypeId">The dataTypeId for the new app logic datamodel</param>
        /// <param name="classRef">The class ref</param>
        /// <returns></returns>
        private bool UpdateApplicationWithAppLogicModel(string org, string app, string dataTypeId, string classRef)
        {
            Application application = GetApplication(org, app);
            if (application.DataTypes == null)
            {
                application.DataTypes = new List<DataType>();
            }

            DataType logicElement = application.DataTypes.Single(d => d.AppLogic != null);

            logicElement.Id = dataTypeId;
            logicElement.AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = classRef };
            UpdateApplication(org, app, application);

            return true;
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
        /// List the available apps on local disk.
        /// </summary>
        /// <returns>A list of apps.</returns>
        public List<ModelMetadata> GetAvailableApps()
        {
            List<ModelMetadata> apps = new List<ModelMetadata>();
            string[] orgPaths = null;

            orgPaths = (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                            ? Directory.GetDirectories(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation"))
                            : Directory.GetDirectories(_settings.RepositoryLocation);

            foreach (string orgPath in orgPaths)
            {
                string[] appPaths = Directory.GetDirectories(orgPath);

                foreach (string appPath in appPaths)
                {
                    string app = Path.GetFileName(appPath);

                    // TODO: figure out if this code is critical for dashboard.
                    /*
                    string metadataPath = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                    if (Directory.Exists(metadataPath))
                    {
                        apps.Add(GetServiceMetaData(org, app));
                    }*/
                }
            }

            return apps;
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
        /// <param name="repoCreated">Whether the repo is created or not</param>
        /// <returns>The repository created in gitea</returns>
        public RepositoryClient.Model.Repository CreateService(string org, ServiceConfiguration serviceConfig, bool repoCreated = false)
        {
            string filename = _settings.GetServicePath(org, serviceConfig.RepositoryName, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + "config.json";
            RepositoryClient.Model.Repository repository = null;
            CreateRepoOption createRepoOption = new RepositoryClient.Model.CreateRepoOption(Name: serviceConfig.RepositoryName, Readme: "Tjenestedata", Description: string.Empty);

            if (!repoCreated)
            {
                repository = CreateRepository(org, createRepoOption);
            }

            if (repository != null && repository.RepositoryCreatedStatus == System.Net.HttpStatusCode.Created)
            {
                if (!File.Exists(filename))
                {
                    _sourceControl.CloneRemoteRepository(org, serviceConfig.RepositoryName);
                }

                ModelMetadata metadata = new ModelMetadata
                {
                    Org = org,
                    ServiceName = serviceConfig.ServiceName,
                    RepositoryName = serviceConfig.RepositoryName,
                };

                // This creates all files
                CreateServiceMetadata(metadata);
                CreateApplicationMetadata(org, serviceConfig.RepositoryName, serviceConfig.ServiceName);

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

                CommitInfo commitInfo = new CommitInfo() { Org = org, Repository = serviceConfig.RepositoryName, Message = "App created" };

                _sourceControl.PushChangesForRepository(commitInfo);
            }

            return repository;
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
        /// Returns a list of all apps for a given org present in the local repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <returns>A list of all apps for the given org.</returns>
        public IList<ServiceConfiguration> GetServices(string org)
        {
            List<ServiceConfiguration> apps = new List<ServiceConfiguration>();
            IList<OrgConfiguration> organisations = GetOwners();
            OrgConfiguration organisation = organisations.FirstOrDefault(so => so.Code == org);

            if (organisation != null)
            {
                string[] appRepositoryPaths = Directory.GetDirectories(_settings.GetOrgPath(org));

                foreach (string appRepositoryPath in appRepositoryPaths)
                {
                    if (File.Exists(appRepositoryPath + "/config.json") && Path.GetFileName(appRepositoryPath) != org)
                    {
                        string textData = File.ReadAllText(appRepositoryPath + "/config.json");
                        apps.Add(JsonConvert.DeserializeObject<ServiceConfiguration>(textData));
                    }
                }
            }

            return apps;
        }

        /// <summary>
        /// Gets all packages for the given app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of all packages created for the given app.</returns>
        public IList<ServicePackageDetails> GetServicePackages(string org, string app)
        {
            Guard.AssertOrgApp(org, app);
            List<ServicePackageDetails> packageDetails = new List<ServicePackageDetails>();
            string packageDirectory = _settings.GetServicePackagesPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            if (!Directory.Exists(packageDirectory))
            {
                return packageDetails;
            }

            foreach (string fileName in Directory.EnumerateFiles(packageDirectory))
            {
                ServicePackageDetails details = JsonConvert.DeserializeObject<ServicePackageDetails>(new StreamReader(ZipFile.OpenRead(fileName).Entries.First(e => e.Name == "ServicePackageDetails.json").Open()).ReadToEnd());
                details.PackageName = Path.GetFileName(fileName);
                packageDetails.Add(details);
            }

            return packageDetails;
        }

        /// <summary>
        /// Updates rules for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="rules">The rules to save</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool UpdateRules(string org, string app, List<RuleContainer> rules)
        {
            try
            {
                Directory.CreateDirectory(_settings.GetRulesPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
                string rulesAsJson = JsonConvert.SerializeObject(rules);
                string filePath = _settings.GetRulesPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RulesFileName;

                File.WriteAllText(filePath, rulesAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Returns the rules for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The rules for an app</returns>
        public List<RuleContainer> GetRules(string org, string app)
        {
            string filename = _settings.GetRulesPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RulesFileName;
            List<RuleContainer> rules = null;

            if (File.Exists(filename))
            {
                string textData = File.ReadAllText(filename, Encoding.UTF8);
                rules = JsonConvert.DeserializeObject<List<RuleContainer>>(textData);
            }

            return rules;
        }

        /// <summary>
        /// Create and clone the organisation's code list
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        public void CreateAndCloneOrgCodeLists(string org)
        {
            org = org.AsFileName();

            try
            {
                string localOrgRepoFolder =
                    (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                    ? $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}/codelists"
                    : $"{_settings.RepositoryLocation}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}/codelists";

                using (LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localOrgRepoFolder))
                {
                    // User has a local repo for codelist.
                    return;
                }
            }
            catch (RepositoryNotFoundException)
            {
                // Happens when developer has not cloned org repo
            }

            // First verify if there exist a remote repo
            try
            {
                _sourceControl.CloneRemoteRepository(org, Constants.General.CodeListRepository);
            }
            catch (Exception ex)
            {
                _logger.LogError("Unable to verify if there exist a remote repo for codelist", ex);
            }

            RepositoryClient.Model.CreateRepoOption createRepoOption = new RepositoryClient.Model.CreateRepoOption(Name: Constants.General.CodeListRepository, Readme: "Kodelister", Description: "Dette er repository for kodelister for " + org);
            CreateRepository(org, createRepoOption);

            try
            {
                _sourceControl.CloneRemoteRepository(org, Constants.General.CodeListRepository);
            }
            catch (Exception ex)
            {
                _logger.LogError("Unable to clone remote repo for codelist", ex);
            }
        }

        /// <summary>
        /// create a repository in gitea for the given org and options
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="createRepoOption">the options for creating a repository</param>
        /// <returns>The newly created repository</returns>
        public AltinnCore.RepositoryClient.Model.Repository CreateRepository(string org, AltinnCore.RepositoryClient.Model.CreateRepoOption createRepoOption)
        {
            return _gitea.CreateRepository(org, createRepoOption).Result;
        }

        /// <summary>
        /// Gets all code lists at org or app level
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>All code lists at the given location</returns>
        public Dictionary<string, string> GetCodelists(string org, string app)
        {
            org = org.AsFileName();
            app = app.AsFileName();

            CreateAndCloneOrgCodeLists(org);

            Dictionary<string, string> codelists = new Dictionary<string, string>();
            string codelistDirectoryPath = null;
            codelistDirectoryPath = (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                ? $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}"
                : $"{_settings.RepositoryLocation}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}";

            if (!string.IsNullOrEmpty(app))
            {
                codelistDirectoryPath += "/" + app;
            }

            codelistDirectoryPath += "/codelists/";

            if (!Directory.Exists(codelistDirectoryPath))
            {
                return codelists;
            }

            string[] directoryFiles = Directory.GetFiles(codelistDirectoryPath);
            foreach (string directoryFile in directoryFiles)
            {
                string fileName = Path.GetFileName(directoryFile);
                string codelistName = fileName.Substring(0, fileName.IndexOf('.'));

                string codelistContents = File.ReadAllText(directoryFile);

                codelists.Add(codelistName, codelistContents);
            }

            return codelists;
        }

        /// <summary>
        /// Method that stores code list to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name on config</param>
        /// <param name="codelist">The content</param>
        /// <returns>A boolean indicating if the code list was successfully saved</returns>
        public bool SaveCodeList(string org, string app, string name, string codelist)
        {
            org = org.AsFileName();
            app = app.AsFileName();
            name = name.AsFileName();

            try
            {
                string filePath =
                    (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                    ? $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}"
                    : $"{_settings.RepositoryLocation}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}";

                if (!string.IsNullOrEmpty(app))
                {
                    filePath += "/" + app;
                }

                filePath += $"/codelists/{name}.json";

                new FileInfo(filePath).Directory.Create();
                File.WriteAllText(filePath, codelist, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Method that deletes a code list from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name on config</param>
        /// <returns>A boolean indicating if the Code List was deleted</returns>
        public bool DeleteCodeList(string org, string app, string name)
        {
            org = org.AsFileName();
            app = app.AsFileName();
            name = name.AsFileName();

            try
            {
                string filePath = (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                ? $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}"
                : $"{_settings.RepositoryLocation}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}";

                if (!string.IsNullOrEmpty(app))
                {
                    filePath += "/" + app;
                }

                filePath += $"/codelists/{name}.json";
                File.Delete(filePath);
            }
            catch (Exception)
            {
                return false;
            }

            return true;
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
                Application existingApplicationMetadata = GetApplication(org, app);

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

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata);
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
        public bool UpdateAppTitle(string org, string app, string languageId, string newTitle)
        {
            Application appMetadata = GetApplication(org, app);

            if (appMetadata == null)
            {
                return false;
            }

            Dictionary<string, string> titles = appMetadata.Title;
            if (titles.ContainsKey(languageId))
            {
                titles[languageId] = newTitle;
            }
            else
            {
                titles.Add(languageId, newTitle);
            }

            appMetadata.Title = titles;

            return UpdateApplication(org, app, appMetadata);
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

        private string GetModelName(string org, string app)
        {
            Application application = GetApplication(org, app);

            string dataTypeId = string.Empty;
            foreach (DataType data in application.DataTypes)
            {
                if (data.AppLogic != null && !string.IsNullOrEmpty(data.AppLogic.ClassRef))
                {
                    dataTypeId = data.Id;
                }
            }

            return dataTypeId;
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
