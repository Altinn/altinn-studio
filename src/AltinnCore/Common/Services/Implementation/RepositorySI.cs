using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Helpers.Extensions;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
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
        /// <param name="serviceMetadata">The <see cref="ServiceMetadata"/></param>
        /// <returns>A boolean indicating if creation of service metadata went ok</returns>
        #region Service metadata0
        public bool CreateServiceMetadata(ServiceMetadata serviceMetadata)
        {
            string metadataAsJson = JsonConvert.SerializeObject(serviceMetadata);
            string orgPath = null;
            string developerUserName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            orgPath = (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                ? Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + serviceMetadata.Org.AsFileName()
                : _settings.GetOrgPath(serviceMetadata.Org.AsFileName(), developerUserName);

            string appPath = orgPath + "/" + serviceMetadata.RepositoryName.AsFileName();

            if (!Directory.Exists(orgPath))
            {
                Directory.CreateDirectory(orgPath);
            }

            if (!Directory.Exists(appPath))
            {
                Directory.CreateDirectory(appPath);
            }

            string metaDataDir = _settings.GetMetadataPath(
                serviceMetadata.Org,
                serviceMetadata.RepositoryName,
                developerUserName);
            DirectoryInfo metaDirectoryInfo = new DirectoryInfo(metaDataDir);
            if (!metaDirectoryInfo.Exists)
            {
                metaDirectoryInfo.Create();
            }

            string resourceDir = _settings.GetResourcePath(
                serviceMetadata.Org,
                serviceMetadata.RepositoryName,
                developerUserName);
            DirectoryInfo resourceDirectoryInfo = new DirectoryInfo(resourceDir);
            if (!resourceDirectoryInfo.Exists)
            {
                resourceDirectoryInfo.Create();
            }

            string dynamicsDir = _settings.GetDynamicsPath(
                serviceMetadata.Org,
                serviceMetadata.RepositoryName,
                developerUserName);
            DirectoryInfo dynamicsDirectoryInfo = new DirectoryInfo(dynamicsDir);
            if (!dynamicsDirectoryInfo.Exists)
            {
                dynamicsDirectoryInfo.Create();
            }

            string calculationDir = _settings.GetCalculationPath(
                serviceMetadata.Org,
                serviceMetadata.RepositoryName,
                developerUserName);
            DirectoryInfo calculationDirectoryInfo = new DirectoryInfo(calculationDir);
            if (!calculationDirectoryInfo.Exists)
            {
                calculationDirectoryInfo.Create();
            }

            string validationDir = _settings.GetValidationPath(
                serviceMetadata.Org,
                serviceMetadata.RepositoryName,
                developerUserName);
            DirectoryInfo validationDirectoryInfo = new DirectoryInfo(validationDir);
            if (!validationDirectoryInfo.Exists)
            {
                validationDirectoryInfo.Create();
            }

            string filePath = metaDataDir + _settings.ServiceMetadataFileName;
            File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);

            AddDefaultFiles(serviceMetadata.Org, serviceMetadata.RepositoryName);
            CreateInitialServiceImplementation(serviceMetadata.Org, serviceMetadata.RepositoryName);
            CreateInitialCalculationHandler(serviceMetadata.Org, serviceMetadata.RepositoryName);
            CreateInitialValidationHandler(serviceMetadata.Org, serviceMetadata.RepositoryName);
            CreateInitialInstansiationHandler(serviceMetadata.Org, serviceMetadata.RepositoryName);
            CreateInitialDynamicsHandler(serviceMetadata.Org, serviceMetadata.RepositoryName);
            CreateInitialWorkflow(serviceMetadata.Org, metaDirectoryInfo);
            CreateInitialDeploymentFiles(serviceMetadata.Org, serviceMetadata.RepositoryName);
            CreateInitialWorkflow(serviceMetadata.Org, serviceMetadata.RepositoryName);
            CreateInitialAuthorizationPolicy(serviceMetadata.Org, serviceMetadata.RepositoryName);

            return true;
        }

        /// <summary>
        /// Creates the application metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation., e.g. "app-name-with-spaces".</param>
        /// <param name="appTitle">The application title in default language (nb), e.g. "App name with spaces"</param>
        public void CreateApplication(string org, string app, string appTitle)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            Application appMetadata = new Application
            {
                Id = ApplicationHelper.GetFormattedApplicationId(org, app),
                VersionId = null,
                Org = org,

                CreatedDateTime = DateTime.UtcNow,
                CreatedBy = developer,
                LastChangedDateTime = DateTime.UtcNow,
                LastChangedBy = developer
            };

            appMetadata.Title = new Dictionary<string, string>();
            appMetadata.Title.Add("nb", appTitle ?? app);

            appMetadata.ElementTypes = new List<Altinn.Platform.Storage.Models.ElementType>();
            appMetadata.ElementTypes.Add(new Altinn.Platform.Storage.Models.ElementType
            {
                Id = "default",
                AllowedContentType = new List<string>() { "application/xml" },
                AppLogic = true
            });
            appMetadata.PartyTypesAllowed = new PartyTypesAllowed();
            string metaDataDir = _settings.GetMetadataPath(
                                    org,
                                    app,
                                    developer);
            DirectoryInfo metaDirectoryInfo = new DirectoryInfo(metaDataDir);
            if (!metaDirectoryInfo.Exists)
            {
                metaDirectoryInfo.Create();
            }

            string metadata = JsonConvert.SerializeObject(appMetadata);
            string filePath = metaDataDir + _settings.ApplicationMetadataFileName;
            File.WriteAllText(filePath, metadata, Encoding.UTF8);
        }

        /// <inheritdoc/>
        public bool UpdateApplication(string org, string app, Application applicationMetadata)
        {
            try
            {
                string applicationMetadataAsJson = JsonConvert.SerializeObject(applicationMetadata);
                string filePath = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ApplicationMetadataFileName;
                File.WriteAllText(filePath, applicationMetadataAsJson, Encoding.UTF8);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when trying to update application metadata ", ex);
                return false;
            }
        }

        /// <summary>
        /// Updates serviceMetadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceMetadata">The serviceMetadata</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool UpdateServiceMetadata(string org, string app, ServiceMetadata serviceMetadata)
        {
            try
            {
                string metadataAsJson = JsonConvert.SerializeObject(serviceMetadata);
                string filePath = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceMetadataFileName;

                File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public bool AddMetadataForAttachment(string org, string app, string applicationMetadata)
        {
            try
            {
                Altinn.Platform.Storage.Models.ElementType formMetadata = JsonConvert.DeserializeObject<Altinn.Platform.Storage.Models.ElementType>(applicationMetadata);
                Application existingApplicationMetadata = GetApplication(org, app);
                existingApplicationMetadata.ElementTypes.Add(formMetadata);

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata);
                string filePath = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ApplicationMetadataFileName;

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
                Altinn.Platform.Storage.Models.ElementType applicationForm = new Altinn.Platform.Storage.Models.ElementType();
                if (applicationForm.AllowedContentType == null)
                {
                    applicationForm.AllowedContentType = new List<string>();
                }

                foreach (string type in fileType)
                {
                    applicationForm.AllowedContentType.Add(MimeTypeMap.GetMimeType(type));
                }

                applicationForm.Id = attachmentMetadata.GetValue("id").Value;
                applicationForm.MaxCount = Convert.ToInt32(attachmentMetadata.GetValue("maxCount").Value);
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

                if (existingApplicationMetadata.ElementTypes != null)
                {
                    Altinn.Platform.Storage.Models.ElementType removeForm = existingApplicationMetadata.ElementTypes.Find(m => m.Id == id);
                    existingApplicationMetadata.ElementTypes.Remove(removeForm);
                }

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata);
                string filePath = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ApplicationMetadataFileName;

                File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Returns the <see cref="ServiceMetadata"/> for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The service metadata for an app.</returns>
        public ServiceMetadata GetServiceMetaData(string org, string app)
        {
            string filedata = string.Empty;
            string filename = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceMetadataFileName;
            try
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
                return JsonConvert.DeserializeObject<ServiceMetadata>(filedata);
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when fetching serviceMetadata ", ex);
                return null;
            }
        }

        /// <inheritdoc/>
        public Application GetApplication(string org, string app)
        {
            string filedata = string.Empty;
            string filename = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ApplicationMetadataFileName;
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
        public string GetResource(string org, string app, string id)
        {
            string filename = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"resource.{id.AsFileName()}.json";
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
            string resourcePath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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

            string resourcePath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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

            string resourcePath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

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
            string filename = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelXSDFileName;
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
            string filename = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelJsonSchemaFileName;
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
            string filePath = _settings.GetDynamicsPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RuleHandlerFileName;
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
            string filePath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
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
        public bool SaveResource(string org, string app, string id, string resource)
        {
            string filePath = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"resource.{id.AsFileName()}.json";
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
        /// Creates the ServiceModel based on XSD
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceMetadata">The serviceMetadata to generate the model based on</param>
        /// <param name="mainXsd">The main XSD for the current app</param>
        /// <returns>A value indicating if everything went ok</returns>
        public bool CreateModel(string org, string app, ServiceMetadata serviceMetadata, XDocument mainXsd)
        {
            JsonMetadataParser modelGenerator = new JsonMetadataParser();

            serviceMetadata.Org = org;
            serviceMetadata.RepositoryName = app;

            string classes = modelGenerator.CreateModelFromMetadata(serviceMetadata);

            // Load currently stored serviceMetadata
            ServiceMetadata original = GetServiceMetaData(org, app);
            string oldRoot = original.Elements != null && original.Elements.Count > 0 ? original.Elements.Values.First(e => e.ParentElement == null).TypeName : null;

            // Update the serviceMetadata with new elements
            original.Elements = serviceMetadata.Elements;
            string newRoot = original.Elements != null && original.Elements.Count > 0 ? original.Elements.Values.First(e => e.ParentElement == null).TypeName : null;

            if (!UpdateServiceMetadata(org, app, original))
            {
                return false;
            }

            // Create the .cs file for the model
            try
            {
                string filePath = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelFileName;
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
                    string filePath = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelXSDFileName;
                    new FileInfo(filePath).Directory.Create();
                    File.WriteAllText(filePath, mainXsdString, Encoding.UTF8);
                }
                catch (Exception)
                {
                    return false;
                }

                // Create the json schema file for the model
                try
                {
                    XsdToJsonSchema xsdToJsonSchemaConverter;
                    using (MemoryStream memStream = new MemoryStream(Encoding.UTF8.GetBytes(mainXsdString)))
                    {
                        xsdToJsonSchemaConverter = new XsdToJsonSchema(XmlReader.Create(memStream), _loggerFactory.CreateLogger<XsdToJsonSchema>());
                    }

                    JsonSchema jsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

                    string filePath = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelJsonSchemaFileName;
                    new FileInfo(filePath).Directory.Create();
                    File.WriteAllText(filePath, new Manatee.Json.Serialization.JsonSerializer().Serialize(jsonSchema).GetIndentedString(0), Encoding.UTF8);
                }
                catch (Exception)
                {
                    return false;
                }
            }

            string resourceDirectory = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            if (!Directory.Exists(resourceDirectory))
            {
                throw new Exception("Resource directory missing.");
            }

            string implementationDirectory = _settings.GetImplementationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            if (!Directory.Exists(implementationDirectory))
            {
                throw new Exception("Implementation directory missing.");
            }

            // Update the ServiceImplementation class with the correct model type name
            string serviceImplementationPath = implementationDirectory + _settings.ServiceImplementationFileName;
            File.WriteAllText(
                serviceImplementationPath,
                File.ReadAllText(serviceImplementationPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, newRoot ?? CodeGeneration.DefaultServiceModelName));

            string calculationHandlerPath = _settings.GetCalculationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.CalculationHandlerFileName;
            File.WriteAllText(
                calculationHandlerPath,
                File.ReadAllText(calculationHandlerPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, newRoot ?? CodeGeneration.DefaultServiceModelName));

            string validationHandlerPath = _settings.GetValidationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ValidationHandlerFileName;
            File.WriteAllText(
                validationHandlerPath,
                File.ReadAllText(validationHandlerPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, newRoot ?? CodeGeneration.DefaultServiceModelName));

            string instansiationHandlerPath = implementationDirectory + _settings.InstantiationHandlerFileName;
            File.WriteAllText(
                instansiationHandlerPath,
                File.ReadAllText(instansiationHandlerPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, newRoot ?? CodeGeneration.DefaultServiceModelName));

            return true;
        }

        /// <summary>
        /// Gets the content of the service model as string.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Service model content.</returns>
        public string GetServiceModel(string org, string app)
        {
            string filename = _settings.GetModelPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelFileName;
            string filedata = null;

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <summary>
        /// List the available apps on local disk
        /// </summary>
        /// <returns>A list of apps</returns>
        public List<ServiceMetadata> GetAvailableServices()
        {
            List<ServiceMetadata> apps = new List<ServiceMetadata>();
            string[] orgPaths = null;

            orgPaths = (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                            ? orgPaths = Directory.GetDirectories(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation"))
                            : orgPaths = Directory.GetDirectories(_settings.RepositoryLocation);

            foreach (string orgPath in orgPaths)
            {
                string org = Path.GetFileName(orgPath);
                string[] appPaths = Directory.GetDirectories(orgPath);

                foreach (string appPath in appPaths)
                {
                    string app = Path.GetFileName(appPath);
                    string metadataPath = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                    if (Directory.Exists(metadataPath))
                    {
                        apps.Add(GetServiceMetaData(org, app));
                    }
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
            AltinnCore.RepositoryClient.Model.Repository repository = null;
            RepositoryClient.Model.CreateRepoOption createRepoOption = new RepositoryClient.Model.CreateRepoOption(Name: serviceConfig.RepositoryName, Readme: "Tjenestedata", Description: string.Empty);

            if (!repoCreated)
            {
                repository = CreateRepository(org, createRepoOption);
            }

            if (repository != null && repository.RepositoryCreatedStatus == System.Net.HttpStatusCode.Created)
            {
                if (!File.Exists(filename))
                {
                    _sourceControl.CloneRemoteRepository(org, serviceConfig.RepositoryName);

                    // Verify if directory exist. Should Exist if Cloning of new repository worked
                    if (!new FileInfo(filename).Directory.Exists)
                    {
                        new FileInfo(filename).Directory.Create();
                    }

                    Stream fileStream = null;
                    try
                    {
                        fileStream = new FileStream(filename, FileMode.Create, FileAccess.ReadWrite);
                        using (StreamWriter streamWriter = new StreamWriter(fileStream))
                        {
                            fileStream = null;
                            streamWriter.WriteLine(JsonConvert.SerializeObject(serviceConfig));
                        }
                    }
                    finally
                    {
                        if (fileStream != null)
                        {
                            fileStream.Dispose();
                        }
                    }
                }

                ServiceMetadata metadata = new ServiceMetadata
                {
                    Org = org,
                    ServiceName = serviceConfig.ServiceName,
                    RepositoryName = serviceConfig.RepositoryName,
                };

                CreateServiceMetadata(metadata);
                CreateApplication(org, serviceConfig.RepositoryName, serviceConfig.ServiceName);

                if (!string.IsNullOrEmpty(serviceConfig.ServiceName))
                {
                    JObject json = JObject.FromObject(new
                    {
                        language = "nb-NO",
                        resources = new[]
                        {
                            new { id = "ServiceName", value = serviceConfig.ServiceName },
                            new { id = "subscription_hook_error_title", value = string.Empty },
                            new { id = "subscription_hook_error_content", value = string.Empty },
                            new { id = "subscription_hook_error_url", value = string.Empty },
                            new { id = "subscription_hook_error_urlText", value = string.Empty },
                            new { id = "subscription_hook_error_urlTextSuffix", value = string.Empty },
                            new { id = "subscription_hook_error_statusCode", value = string.Empty }
                        },
                    });
                    SaveResource(org, serviceConfig.RepositoryName, "nb-NO", json.ToString());
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

                using (Repository repo = new Repository(localOrgRepoFolder))
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

            string[] jsFiles = Directory.GetFiles(_settings.GetDynamicsPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
            foreach (string file in jsFiles)
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
        /// Returns content of an implementation file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file name</param>
        /// <returns>Content of an implementation file</returns>
        public string GetImplementationFile(string org, string app, string fileName)
        {
            string filename = _settings.GetImplementationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
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
        public void SaveImplementationFile(string org, string app, string fileName, string fileContent)
        {
            string filename = _settings.GetImplementationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
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
            string filename = _settings.GetResourcePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            File.WriteAllText(filename, fileContent, Encoding.UTF8);
        }

        /// <summary>
        /// Returns a list of workflow steps
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of workflow steps</returns>
        public List<WorkFlowStep> GetWorkFlow(string org, string app)
        {
            string filename = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.WorkFlowFileName;
            string textData = File.ReadAllText(filename, Encoding.UTF8);

            return JsonConvert.DeserializeObject<List<WorkFlowStep>>(textData);
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
                string filePath = _settings.GetMetadataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ApplicationMetadataFileName;

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

        private void AddDefaultFiles(string org, string app)
        {
            // Create the app test folder
            Directory.CreateDirectory(_settings.GetTestPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

            // Create the app testdata folder
            Directory.CreateDirectory(_settings.GetTestDataPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

            // Copy default Dockerfile
            string appPath = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            File.Copy(_generalSettings.DefaultRepoDockerfile, appPath + _settings.DockerfileFileName);
            File.Copy(_generalSettings.DefaultProjectFile, appPath + _settings.ProjectFileName);
            File.Copy(_generalSettings.DefaultGitIgnoreFile, appPath + _settings.GitIgnoreFileName);
        }

        private void CreateInitialServiceImplementation(string org, string app)
        {
            // Read the ServiceImplementation template
            string textData = File.ReadAllText(_generalSettings.ServiceImplementationTemplate, Encoding.UTF8);

            // Replace the template default namespace
            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, CompileHelper.GetCSharpValidAppId(app)));

            // Create the Implementation folder
            Directory.CreateDirectory(_settings.GetImplementationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

            // Get the file path
            string serviceImplemenationFilePath = _settings.GetImplementationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceImplementationFileName;
            File.WriteAllText(serviceImplemenationFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialWorkflow(string org, string app)
        {
            // Read the workflow template
            string textData = File.ReadAllText(_generalSettings.WorkflowTemplate, Encoding.UTF8);

            // Create the workflow folder
            Directory.CreateDirectory(_settings.GetWorkflowPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

            // Get the file path
            string workflowFilePath = _settings.GetWorkflowPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.WorkflowFileName;
            File.WriteAllText(workflowFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialAuthorizationPolicy(string org, string app)
        {
            // Read the authorization policy template (XACML file).
            string authorizationPolicyData = File.ReadAllText(_generalSettings.AuthorizationPolicyTemplate, Encoding.UTF8);

            // Replace "org" and "app" in the authorization policy file.
            authorizationPolicyData = authorizationPolicyData.Replace("[ORG]", org).Replace("[APP]", app);

            // Create the Authorization folder.
            Directory.CreateDirectory(_settings.GetAuthorizationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

            // Get the file path.
            string authorizationPolicyFilePath = _settings.GetAuthorizationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.AuthorizationPolicyFileName;
            File.WriteAllText(authorizationPolicyFilePath, authorizationPolicyData, Encoding.UTF8);
        }

        private void CreateInitialCalculationHandler(string org, string app)
        {
            // Read the calculation handler template
            string textData = File.ReadAllText(_generalSettings.CalculateHandlerTemplate, Encoding.UTF8);

            // Replace the template default namespace
            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, CompileHelper.GetCSharpValidAppId(app)));

            // Get the file path
            string calculationHandlerFilePath = _settings.GetCalculationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.CalculationHandlerFileName;
            File.WriteAllText(calculationHandlerFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialDynamicsHandler(string org, string app)
        {
            // Read the rule handler template
            string textData = File.ReadAllText(_generalSettings.RuleHandlerTemplate, Encoding.UTF8);

            // Replace the template default namespace
            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, CompileHelper.GetCSharpValidAppId(app)));

            // Get the file path
            string ruleHandlerFilePath = _settings.GetDynamicsPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RuleHandlerFileName;
            File.WriteAllText(ruleHandlerFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialValidationHandler(string org, string app)
        {
            // Read the validation handler template
            string textData = File.ReadAllText(_generalSettings.ValidationHandlerTemplate, Encoding.UTF8);

            // Replace the template default namespace
            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, CompileHelper.GetCSharpValidAppId(app)));

            // Get the file path
            string validationHandlerFilePath = _settings.GetValidationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ValidationHandlerFileName;
            File.WriteAllText(validationHandlerFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialInstansiationHandler(string org, string app)
        {
            // Read the instantiation handler template
            string textData = File.ReadAllText(_generalSettings.InstantiationHandlerTemplate, Encoding.UTF8);

            // Replace the template default namespace
            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, CompileHelper.GetCSharpValidAppId(app)));

            // Get the file path
            string instansiationHandlerFilePath = _settings.GetImplementationPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.InstantiationHandlerFileName;
            File.WriteAllText(instansiationHandlerFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialWorkflow(string org, DirectoryInfo targetDirectory)
        {
            string destFileName = Path.Combine(targetDirectory.FullName, _settings.WorkFlowFileName);
            if (File.Exists(destFileName))
            {
                return;
            }

            FileInfo sourceFile = _defaultFileFactory.GetJsonDefaultFile(_settings.WorkFlowFileName, org);
            if (sourceFile != null && sourceFile.Exists)
            {
                sourceFile.CopyTo(destFileName);
            }
        }

        private void CreateInitialWebApp(string org, DirectoryInfo targetDirectory)
        {
            string destFileName = Path.Combine(targetDirectory.FullName, _settings.RuntimeAppFileName);
            if (File.Exists(destFileName))
            {
                return;
            }

            FileInfo sourceFile = _defaultFileFactory.GetWebAppDefaultFile(_settings.RuntimeAppFileName, org);
            if (sourceFile != null && sourceFile.Exists)
            {
                sourceFile.CopyTo(destFileName);
            }
        }

        private void CreateInitialDeploymentFiles(string org, string app)
        {
            string sourcePath = _generalSettings.DeploymentLocation;
            string targetPath = _settings.GetDeploymentPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

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
