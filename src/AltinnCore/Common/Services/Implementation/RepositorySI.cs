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
    /// Service that handles functionality needed for creating and updating services in AltinnCore
    /// </summary>
    public class RepositorySI : AltinnCore.Common.Services.Interfaces.IRepository
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
        /// <param name="repositorySettings">The settings for the service repository</param>
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
        /// Method that creates service metadata for a new service
        /// </summary>
        /// <param name="serviceMetadata">The serviceMetadata</param>
        /// <returns>A boolean indicating if creation of service went ok</returns>
        #region Service metadata
        public bool CreateServiceMetadata(ServiceMetadata serviceMetadata)
        {
            string metadataAsJson = JsonConvert.SerializeObject(serviceMetadata);
            string serviceOrgPath = null;

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                serviceOrgPath = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + serviceMetadata.Org;
            }
            else
            {
                serviceOrgPath = _settings.RepositoryLocation + serviceMetadata.Org;
            }

            string servicePath = serviceOrgPath + "/" + serviceMetadata.RepositoryName;

            if (!Directory.Exists(serviceOrgPath))
            {
                Directory.CreateDirectory(serviceOrgPath);
            }

            if (!Directory.Exists(servicePath))
            {
                Directory.CreateDirectory(servicePath);
            }

            string metaDataDir = _settings.GetMetadataPath(
                serviceMetadata.Org,
                serviceMetadata.RepositoryName,
                AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            DirectoryInfo metaDirectoryInfo = new DirectoryInfo(metaDataDir);
            if (!metaDirectoryInfo.Exists)
            {
                metaDirectoryInfo.Create();
            }

            string resourceDir = _settings.GetResourcePath(
                serviceMetadata.Org,
                serviceMetadata.RepositoryName,
                AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            DirectoryInfo resourceDirectoryInfo = new DirectoryInfo(resourceDir);
            if (!resourceDirectoryInfo.Exists)
            {
                resourceDirectoryInfo.Create();
            }

            string dynamicsDir = _settings.GetDynamicsPath(
                serviceMetadata.Org,
                serviceMetadata.RepositoryName,
                AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            DirectoryInfo dynamicsDirectoryInfo = new DirectoryInfo(dynamicsDir);
            if (!dynamicsDirectoryInfo.Exists)
            {
                dynamicsDirectoryInfo.Create();
            }

            string calculationDir = _settings.GetCalculationPath(
                serviceMetadata.Org,
                serviceMetadata.RepositoryName,
                AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            DirectoryInfo calculationDirectoryInfo = new DirectoryInfo(calculationDir);
            if (!calculationDirectoryInfo.Exists)
            {
                calculationDirectoryInfo.Create();
            }

            string validationDir = _settings.GetValidationPath(
                serviceMetadata.Org,
                serviceMetadata.RepositoryName,
                AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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

            return true;
        }

        /// <summary>
        /// Creates the application metadata file
        /// </summary>
        /// <param name="applicationOwnerId">the application owner</param>
        /// <param name="applicationId">the application id</param>
        public void CreateApplicationMetadata(string applicationOwnerId, string applicationId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            ApplicationMetadata appMetadata = new ApplicationMetadata
            {
                Id = ApplicationHelper.GetFormattedApplicationId(applicationOwnerId, applicationId),
                VersionId = null,
                ApplicationOwnerId = applicationOwnerId,
                CreatedDateTime = DateTime.UtcNow,
                CreatedBy = developer,
                LastChangedDateTime = DateTime.UtcNow,
                LastChangedBy = developer
            };

            if (appMetadata.Title == null)
            {
                appMetadata.Title = new Dictionary<string, string>();
            }
            
            appMetadata.Title.Add("nb-no", applicationId);
            if (appMetadata.Forms == null)
            {
                appMetadata.Forms = new List<ApplicationForm>();
            }

            appMetadata.Forms.Add(new ApplicationForm
            {
                Id = "default",
                AllowedContentType = new List<string>() { "application/xml" },
                ShouldEncrypt = true,
            });

            string metaDataDir = _settings.GetMetadataPath(
                                    applicationOwnerId,
                                    applicationId,
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

        /// <summary>
        /// Updates serviceMetadata
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="serviceMetadata">The service Metadata</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool UpdateServiceMetadata(string org, string service, ServiceMetadata serviceMetadata)
        {
            try
            {
                string metadataAsJson = JsonConvert.SerializeObject(serviceMetadata);
                string filePath = _settings.GetMetadataPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceMetadataFileName;

                File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public bool AddMetadataForAttachment(string org, string applicationId, string applicationMetadata)
        {
            try
            {
                ApplicationForm formMetadata = JsonConvert.DeserializeObject<ApplicationForm>(applicationMetadata);
                ApplicationMetadata existingApplicationMetadata = GetApplicationMetadata(org, applicationId);
                existingApplicationMetadata.Forms.Add(formMetadata);

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata);
                string filePath = _settings.GetMetadataPath(org, applicationId, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ApplicationMetadataFileName;

                File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public bool UpdateMetadataForAttachment(string org, string applicationId, string applicationMetadata)
        {
            try
            {
                dynamic attachmentMetadata = JsonConvert.DeserializeObject(applicationMetadata);
                string attachmentId = attachmentMetadata.GetValue("id").Value;
                string fileTypes = attachmentMetadata.GetValue("fileType") == null ? "all" : attachmentMetadata.GetValue("fileType").Value;
                string[] fileType = fileTypes.Split(",");
                ApplicationForm applicationForm = new ApplicationForm();
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
                               
                DeleteMetadataForAttachment(org, applicationId, attachmentId);
                string metadataAsJson = JsonConvert.SerializeObject(applicationForm);
                AddMetadataForAttachment(org, applicationId, metadataAsJson);
            }
            catch (Exception)
            {
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public bool DeleteMetadataForAttachment(string org, string applicationId, string id)
        {
            try
            {
                ApplicationMetadata existingApplicationMetadata = GetApplicationMetadata(org, applicationId);

                if (existingApplicationMetadata.Forms != null)
                {
                    ApplicationForm removeForm = existingApplicationMetadata.Forms.Find(m => m.Id == id);
                    existingApplicationMetadata.Forms.Remove(removeForm);
                }

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata);
                string filePath = _settings.GetMetadataPath(org, applicationId, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ApplicationMetadataFileName;

                File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Returns the service metadata for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The service metadata for a service</returns>
        public ServiceMetadata GetServiceMetaData(string org, string service)
        {
            string filedata = string.Empty;
            string filename = _settings.GetMetadataPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceMetadataFileName;
            try
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
                return JsonConvert.DeserializeObject<ServiceMetadata>(filedata);
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when fetching service metadata ", ex);
                return null;
            }
        }

        /// <summary>
        /// Returns the service metadata for a service
        /// </summary>
        /// <param name="applicationOwnerId">the applicatio owner</param>
        /// <param name="applicationId">the application owner</param>
        /// <returns>The application  metadata for an application</returns>
        public ApplicationMetadata GetApplicationMetadata(string applicationOwnerId, string applicationId)
        {
            string filedata = string.Empty;
            string filename = _settings.GetMetadataPath(applicationOwnerId, applicationId, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ApplicationMetadataFileName;
            try
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
                return JsonConvert.DeserializeObject<ApplicationMetadata>(filedata);
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when fetching service metadata. {0}", ex);
                return null;
            }
        }

        #endregion

        /// <summary>
        /// Returns the content of a configuration file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name of the configuration</param>
        /// <returns>A string containing the file content</returns>
        public string GetConfiguration(string org, string service, string name)
        {
            string filename = _settings.GetMetadataPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + name;
            string filedata = null;

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <summary>
        /// Returns the content of a file path relative to the root folder
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The name of the configuration</param>
        /// <returns>A string containing the file content</returns>
        public string GetFileByRelativePath(string org, string service, string fileName)
        {
            string filename = _settings.GetServicePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <returns>The resource file content</returns>
        public string GetResource(string org, string service, string id)
        {
            string filename = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"resource.{id}.json";
            string filedata = null;

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <summary>
        /// Returns the service texts
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The text</returns>
        public Dictionary<string, Dictionary<string, string>> GetServiceTexts(string org, string service)
        {
            Dictionary<string, Dictionary<string, string>> serviceTextsAllLanguages =
                new Dictionary<string, Dictionary<string, string>>();

            // Get service level text resources
            string resourcePath = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            serviceTextsAllLanguages = GetResourceTexts(resourcePath, serviceTextsAllLanguages);

            // Get Org level text resources
            string orgResourcePath = _settings.GetOrgTextResourcePath(org, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            serviceTextsAllLanguages = GetResourceTexts(orgResourcePath, serviceTextsAllLanguages);

            // Get altinn common level text resources
            string commonResourcePath = _settings.GetCommonTextResourcePath(AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            serviceTextsAllLanguages = GetResourceTexts(commonResourcePath, serviceTextsAllLanguages);

            return serviceTextsAllLanguages;
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
        /// Returns the service languages
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The text</returns>
        public List<string> GetLanguages(string org, string service)
        {
            List<string> languages = new List<string>();

            string resourcePath = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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
        /// Save service texts to resource files
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="texts">The texts to be saved</param>
        public void SaveServiceTexts(string org, string service, Dictionary<string, Dictionary<string, string>> texts)
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

            string resourcePath = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

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
        /// Get the Xsd model from disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the Xsd object as a string</returns>
        public string GetXsdModel(string org, string service)
        {
            string filename = _settings.GetModelPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelXSDFileName;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the Json Schema object as a string</returns>
        public string GetJsonSchemaModel(string org, string service)
        {
            string filename = _settings.GetModelPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelJsonSchemaFileName;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetJsonFormLayout(string org, string service)
        {
            string filePath = _settings.GetFormLayoutPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetJsonThirdPartyComponents(string org, string service)
        {
            string filePath = _settings.GetThirdPartyComponentsPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetRuleHandler(string org, string service)
        {
            string filePath = _settings.GetDynamicsPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RuleHandlerFileName;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetCalculationHandler(string org, string service)
        {
            string filePath = _settings.GetCalculationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RuleHandlerFileName;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The filename so read from</param>
        /// <returns>Returns the json object as a string</returns>
        public string GetJsonFile(string org, string service, string fileName)
        {
            string filePath = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveJsonFormLayout(string org, string service, string resource)
        {
            string filePath = _settings.GetFormLayoutPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, resource, Encoding.UTF8);

            return true;
        }

        /// <summary>
        /// Save the JSON third party components to disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveJsonThirdPartyComponents(string org, string service, string resource)
        {
            string filePath = _settings.GetThirdPartyComponentsPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, resource, Encoding.UTF8);

            return true;
        }

        /// <summary>
        /// Save the JSON file to disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="resource">The content of the resource file</param>
        /// <param name="fileName">the filename</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveJsonFile(string org, string service, string resource, string fileName)
        {
            string filePath = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, resource, Encoding.UTF8);

            return true;
        }

        /// <summary>
        /// Gets the raw content of a code list
        /// </summary>
        /// <param name="org">The organization code of the service owner</param>
        /// <param name="service">The service code of the current service</param>
        /// <param name="name">The name of the code list to retrieve</param>
        /// <returns>Raw contents of a code list file</returns>
        public string GetCodelist(string org, string service, string name)
        {
            try
            {
                Dictionary<string, string> allCodelists = GetCodelists(org, service);

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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name on config</param>
        /// <param name="config">The content</param>
        /// <returns>A boolean indicating if everything went ok</returns>
        public bool SaveConfiguration(string org, string service, string name, string config)
        {
            string filePath = _settings.GetMetadataPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + name;
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, config, Encoding.UTF8);

            return true;
        }

        /// <summary>
        /// Method that stores contents of file path relative to root
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The name on config</param>
        /// <param name="fileContent">The content</param>
        /// <returns>A boolean indicating if everything went ok</returns>
        public bool SaveFile(string org, string service, string fileName, string fileContent)
        {
            string filePath = _settings.GetServicePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            File.WriteAllText(filePath, fileContent, Encoding.UTF8);
            return true;
        }

        /// <summary>
        /// Stores the resource for a given language id
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool SaveResource(string org, string service, string id, string resource)
        {
            string filePath = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"resource.{id}.json";
            new FileInfo(filePath).Directory.Create();
            File.WriteAllText(filePath, resource, Encoding.UTF8);

            return true;
        }

        /// <summary>
        /// Deletes the language resource for a given language id
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <returns>A boolean indicating if the delete was a success</returns>
        public bool DeleteLanguage(string org, string service, string id)
        {
            string filename = string.Format(_settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext))) + $"resource.{id}.json";
            bool deleted = false;

            if (File.Exists(filename))
            {
                File.Delete(filename);
                deleted = true;
            }

            return deleted;
        }

        /// <summary>
        /// Creates the Service Model based on XSD
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="serviceMetadata">The service metadata to generate the model based on</param>
        /// <param name="mainXsd">The main XSD for the current service</param>
        /// <returns>A value indicating if everything went ok</returns>
        public bool CreateModel(string org, string service, ServiceMetadata serviceMetadata, XDocument mainXsd)
        {
            JsonMetadataParser modelGenerator = new JsonMetadataParser();

            serviceMetadata.Org = org;
            serviceMetadata.RepositoryName = service;

            string classes = modelGenerator.CreateModelFromMetadata(serviceMetadata);

            // Load currently stored service metadata
            ServiceMetadata original = GetServiceMetaData(org, service);
            string oldRoot = original.Elements != null && original.Elements.Count > 0 ? original.Elements.Values.First(e => e.ParentElement == null).TypeName : null;

            // Update the service metadata with new elements
            original.Elements = serviceMetadata.Elements;
            string newRoot = original.Elements != null && original.Elements.Count > 0 ? original.Elements.Values.First(e => e.ParentElement == null).TypeName : null;

            if (!UpdateServiceMetadata(org, service, original))
            {
                return false;
            }

            // Create the .cs file for the model
            try
            {
                string filePath = _settings.GetModelPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelFileName;
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
                    string filePath = _settings.GetModelPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelXSDFileName;
                    new FileInfo(filePath).Directory.Create();
                    File.WriteAllText(filePath, mainXsdString, Encoding.UTF8);
                }
                catch (Exception)
                {
                    return false;
                }

                // Create the .jsd file for the model
                try
                {
                    XsdToJsonSchema xsdToJsonSchemaConverter;
                    using (MemoryStream memStream = new MemoryStream(Encoding.UTF8.GetBytes(mainXsdString)))
                    {
                        xsdToJsonSchemaConverter = new XsdToJsonSchema(XmlReader.Create(memStream), _loggerFactory.CreateLogger<XsdToJsonSchema>());
                    }

                    JsonSchema jsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

                    string filePath = _settings.GetModelPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelJsonSchemaFileName;
                    new FileInfo(filePath).Directory.Create();
                    File.WriteAllText(filePath, new Manatee.Json.Serialization.JsonSerializer().Serialize(jsonSchema).GetIndentedString(0), Encoding.UTF8);
                }
                catch (Exception)
                {
                    return false;
                }
            }

            string resourceDirectory = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            if (!Directory.Exists(resourceDirectory))
            {
                throw new Exception("Resource directory missing.");
            }

            string implementationDirectory = _settings.GetImplementationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            if (!Directory.Exists(implementationDirectory))
            {
                throw new Exception("Implementation directory missing.");
            }

            // Update the service implementation class with the correct model type name
            string serviceImplementationPath = implementationDirectory + _settings.ServiceImplementationFileName;
            File.WriteAllText(
                serviceImplementationPath,
                File.ReadAllText(serviceImplementationPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, newRoot ?? CodeGeneration.DefaultServiceModelName));

            string calculationHandlerPath = _settings.GetCalculationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.CalculationHandlerFileName;
            File.WriteAllText(
                calculationHandlerPath,
                File.ReadAllText(calculationHandlerPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, newRoot ?? CodeGeneration.DefaultServiceModelName));

            string validationHandlerPath = _settings.GetValidationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ValidationHandlerFileName;
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
        /// Gets the content of the service model as string
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Service model content</returns>
        public string GetServiceModel(string org, string service)
        {
            string filename = _settings.GetModelPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelFileName;
            string filedata = null;

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <summary>
        /// List the available services on local disk
        /// </summary>
        /// <returns>A list of services</returns>
        public List<ServiceMetadata> GetAvailableServices()
        {
            List<ServiceMetadata> services = new List<ServiceMetadata>();
            string[] serviceOwners = null;
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                serviceOwners = Directory.GetDirectories(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation"));
            }
            else
            {
                serviceOwners = Directory.GetDirectories(_settings.RepositoryLocation);
            }

            foreach (string serviceOwner in serviceOwners)
            {
                string serviceOwnerFileName = Path.GetFileName(serviceOwner);
                string[] serviceRepos = Directory.GetDirectories(serviceOwner);

                foreach (string serviceRepo in serviceRepos)
                {
                    string serviceRepoFileName = Path.GetFileName(serviceRepo);
                    string serviceDirectory = _settings.GetMetadataPath(serviceOwnerFileName, serviceRepoFileName, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                    if (Directory.Exists(serviceDirectory))
                    {
                        services.Add(GetServiceMetaData(serviceOwnerFileName, serviceRepoFileName));
                    }
                }
            }

            return services;
        }

        /// <summary>
        /// Returns a list of all service owners present in the local repository
        /// </summary>
        /// <returns>A list of all service owners</returns>
        public IList<OrgConfiguration> GetOwners()
        {
            List<OrgConfiguration> serviceOwners = new List<OrgConfiguration>();

            string[] serviceOwnerDirectories = null;
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                serviceOwnerDirectories = Directory.GetDirectories(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation"));
            }
            else
            {
                serviceOwnerDirectories = Directory.GetDirectories(_settings.RepositoryLocation);
            }

            foreach (string serviceOwnerDirectory in serviceOwnerDirectories)
            {
                string filename = serviceOwnerDirectory + "/" + Path.GetFileName(serviceOwnerDirectory) + "/config.json";
                if (File.Exists(filename))
                {
                    string textData = File.ReadAllText(filename);
                    serviceOwners.Add(JsonConvert.DeserializeObject<OrgConfiguration>(textData));
                }
            }

            return serviceOwners;
        }

        /// <summary>
        /// Creates a new service folder under the given <paramref name="owner">service owner</paramref> and saves the
        /// given <paramref name="serviceConfig"/>
        /// </summary>
        /// <param name="owner">The service owner to create the new service under</param>
        /// <param name="serviceConfig">The service configuration to save</param>
        /// <param name="repoCreated">whether the repo is created or not</param>
        /// <returns>The repository created in gitea</returns>
        public RepositoryClient.Model.Repository CreateService(string owner, ServiceConfiguration serviceConfig, bool repoCreated = false)
        {
            string filename = _settings.GetServicePath(owner, serviceConfig.RepositoryName, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + "config.json";
            AltinnCore.RepositoryClient.Model.Repository repository = null;
            RepositoryClient.Model.CreateRepoOption createRepoOption = new RepositoryClient.Model.CreateRepoOption(Name: serviceConfig.RepositoryName, Readme: "Tjenestedata", Description: string.Empty);

            if (!repoCreated)
            {
                repository = CreateRepository(owner, createRepoOption);
            }

            if (repository != null && repository.RepositoryCreatedStatus == System.Net.HttpStatusCode.Created)
            {
                if (!File.Exists(filename))
                {
                    _sourceControl.CloneRemoteRepository(owner, serviceConfig.RepositoryName);

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
                    Org = owner,
                    ServiceName = serviceConfig.ServiceName,
                    RepositoryName = serviceConfig.RepositoryName,
                };

                CreateServiceMetadata(metadata);
                CreateApplicationMetadata(owner, serviceConfig.ServiceName);

                if (!string.IsNullOrEmpty(serviceConfig.ServiceName))
                {
                    JObject json = JObject.FromObject(new
                    {
                        language = "nb-NO",
                        resources = new[] { new { id = "ServiceName", value = serviceConfig.ServiceName } },
                    });
                    SaveResource(owner, serviceConfig.RepositoryName, "nb-NO", json.ToString());
                }

                CommitInfo commitInfo = new CommitInfo() { Org = owner, Repository = serviceConfig.RepositoryName, Message = "Service Created" };

                _sourceControl.PushChangesForRepository(commitInfo);
            }

            return repository;
        }

        /// <summary>
        /// Delete a service from disk
        /// </summary>
        /// <param name="org">The service owner to delete the service from</param>
        /// <param name="service">The service to delete</param>
        /// <returns>true if success, false otherwise</returns>
        public bool DeleteService(string org, string service)
        {
            try
            {
                string developerUserName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

                string directoryPath = null;

                if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                {
                    directoryPath = $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}/{developerUserName}/{org}";
                }
                else
                {
                    directoryPath = $"{_settings.RepositoryLocation}/{developerUserName}/{org}";
                }

                if (!string.IsNullOrEmpty(service))
                {
                    directoryPath += "/" + service;
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
        /// Returns a list of all services for a given service owner present in the local repository
        /// </summary>
        /// <param name="org">The service owner code to use when getting services</param>
        /// <returns>A list of all services for the given org</returns>
        public IList<ServiceConfiguration> GetServices(string org)
        {
            List<ServiceConfiguration> services = new List<ServiceConfiguration>();
            IList<OrgConfiguration> owners = GetOwners();
            OrgConfiguration owner = owners.FirstOrDefault(so => so.Code == org);

            if (owner != null)
            {
                string[] serviceRepos = Directory.GetDirectories(_settings.GetOrgPath(org));

                foreach (string serviceRepo in serviceRepos)
                {
                    if (File.Exists(serviceRepo + "/config.json") && Path.GetFileName(serviceRepo) != org)
                    {
                        string textData = File.ReadAllText(serviceRepo + "/config.json");
                        services.Add(JsonConvert.DeserializeObject<ServiceConfiguration>(textData));
                    }
                }
            }

            return services;
        }

        /// <summary>
        /// Gets all service packages for the given service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A list of all service packages created for the given service </returns>
        public IList<ServicePackageDetails> GetServicePackages(string org, string service)
        {
            Guard.AssertOrgService(org, service);
            List<ServicePackageDetails> packageDetails = new List<ServicePackageDetails>();
            string packageDirectory = _settings.GetServicePackagesPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

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
        /// Updates rules for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="rules">The rules to save</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool UpdateRules(string org, string service, List<RuleContainer> rules)
        {
            try
            {
                Directory.CreateDirectory(_settings.GetRulesPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
                string rulesAsJson = JsonConvert.SerializeObject(rules);
                string filePath = _settings.GetRulesPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RulesFileName;

                File.WriteAllText(filePath, rulesAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Returns the rules for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The rules for a service</returns>
        public List<RuleContainer> GetRules(string org, string service)
        {
            string filename = _settings.GetRulesPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RulesFileName;
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
        /// <param name="org">the organisation</param>
        public void CreateAndCloneOrgCodeLists(string org)
        {
            try
            {
                string localServiceRepoFolder = null;
                if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                {
                    localServiceRepoFolder = $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}/codelists";
                }
                else
                {
                    localServiceRepoFolder = $"{_settings.RepositoryLocation}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}/codelists";
                }

                using (Repository repo = new Repository(localServiceRepoFolder))
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
        /// create a repository in gitea for the given organisation and options
        /// </summary>
        /// <param name="owner">the owner</param>
        /// <param name="createRepoOption">the options for creating a repository</param>
        /// <returns>The newly created repository</returns>
        public AltinnCore.RepositoryClient.Model.Repository CreateRepository(string owner, AltinnCore.RepositoryClient.Model.CreateRepoOption createRepoOption)
        {
            return _gitea.CreateRepository(owner, createRepoOption).Result;
        }

        /// <summary>
        /// Gets all code lists at service owner or service level
        /// </summary>
        /// <param name="org">The service owner code of the service owner to get code lists for</param>
        /// <param name="service">The service code of the service to get code lists for</param>
        /// <returns>All code lists for at the given location</returns>
        public Dictionary<string, string> GetCodelists(string org, string service)
        {
            CreateAndCloneOrgCodeLists(org);

            Dictionary<string, string> codelists = new Dictionary<string, string>();
            string codelistDirectoryPath = null;
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                codelistDirectoryPath = $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}";
            }
            else
            {
                codelistDirectoryPath = $"{_settings.RepositoryLocation}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}";
            }

            if (!string.IsNullOrEmpty(service))
            {
                codelistDirectoryPath += "/" + service;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name on config</param>
        /// <param name="codelist">The content</param>
        /// <returns>A boolean indicating if the code list was successfully saved</returns>
        public bool SaveCodeList(string org, string service, string name, string codelist)
        {
            try
            {
                string filePath = null;
                if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                {
                    filePath = $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}";
                }
                else
                {
                    filePath = $"{_settings.RepositoryLocation}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}";
                }

                if (!string.IsNullOrEmpty(service))
                {
                    filePath += "/" + service;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name on config</param>
        /// <returns>A boolean indicating if the Code List was deleted</returns>
        public bool DeleteCodeList(string org, string service, string name)
        {
            try
            {
                string filePath = null;
                if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                {
                    filePath = $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}";
                }
                else
                {
                    filePath = $"{_settings.RepositoryLocation}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}";
                }

                if (!string.IsNullOrEmpty(service))
                {
                    filePath += "/" + service;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name of the view</param>
        public void DeleteTextResource(string org, string service, string name)
        {
            Guard.AssertArgumentNotNullOrWhiteSpace(name, nameof(name));
            string resourceTextKey = ViewResourceKey(name);

            IEnumerable<ResourceWrapper> resources = GetAllResources(org, service);
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
        /// Returns a list over the implementation files for a Altinn Core service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A list of file names</returns>
        public List<AltinnCoreFile> GetImplementationFiles(string org, string service)
        {
            List<AltinnCoreFile> coreFiles = new List<AltinnCoreFile>();

            string[] files = Directory.GetFiles(_settings.GetImplementationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
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

            if (Directory.Exists(_settings.GetModelPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext))))
            {
                modelFiles = Directory.GetFiles(_settings.GetModelPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
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

            string[] jsFiles = Directory.GetFiles(_settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
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
        /// Returns a list over the dynamics files for a Altinn Core service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A list of file names</returns>
        public List<AltinnCoreFile> GetDynamicsFiles(string org, string service)
        {
            List<AltinnCoreFile> coreFiles = new List<AltinnCoreFile>();

            string[] jsFiles = Directory.GetFiles(_settings.GetDynamicsPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
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
        /// Returns a list over the calculation files for a Altinn Core service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A list of file names</returns>
        public List<AltinnCoreFile> GetCalculationFiles(string org, string service)
        {
            List<AltinnCoreFile> coreFiles = new List<AltinnCoreFile>();

            string[] files = Directory.GetFiles(_settings.GetCalculationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
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
        /// Returns a list over the validation files for a Altinn Core service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A list of file names</returns>
        public List<AltinnCoreFile> GetValidationFiles(string org, string service)
        {
            List<AltinnCoreFile> coreFiles = new List<AltinnCoreFile>();

            string[] files = Directory.GetFiles(_settings.GetValidationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
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
        /// Returns content of a implementation file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The file Name</param>
        /// <returns>The file content</returns>
        public string GetImplementationFile(string org, string service, string fileName)
        {
            string filename = _settings.GetImplementationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The file Name</param>
        /// <returns>The file content</returns>
        public string GetResourceFile(string org, string service, string fileName)
        {
            string filename = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            string filedata = null;

            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <summary>
        /// Saving a implementation file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The fileName</param>
        /// <param name="fileContent">The file content</param>
        public void SaveImplementationFile(string org, string service, string fileName, string fileContent)
        {
            string filename = _settings.GetImplementationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            File.WriteAllText(filename, fileContent, Encoding.UTF8);
        }

        /// <summary>
        /// Saving a resouce file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The fileName</param>
        /// <param name="fileContent">The file content</param>
        public void SaveResourceFile(string org, string service, string fileName, string fileContent)
        {
            string filename = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
            File.WriteAllText(filename, fileContent, Encoding.UTF8);
        }

        /// <summary>
        /// Returns a list of workflow steps
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A list of workflow steps</returns>
        public List<WorkFlowStep> GetWorkFlow(string org, string service)
        {
            string filename = _settings.GetMetadataPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.WorkFlowFileName;
            string textData = File.ReadAllText(filename, Encoding.UTF8);

            return JsonConvert.DeserializeObject<List<WorkFlowStep>>(textData);
        }

        /// <summary>
        /// Updates the view name text resource.
        /// "view." + viewName for each text resource in the service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="currentName">Current / old view name</param>
        /// <param name="newName">the new view name</param>
        public void UpdateViewNameTextResource(string org, string service, string currentName, string newName)
        {
            Guard.AssertArgumentNotNullOrWhiteSpace(currentName, nameof(currentName));
            Guard.AssertArgumentNotNullOrWhiteSpace(newName, nameof(newName));

            string currentKey = ViewResourceKey(currentName);
            string newKey = ViewResourceKey(newName);

            IEnumerable<ResourceWrapper> resources = GetAllResources(org, service);
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
        /// Finds a service resource embedded in the service when running from local file folders
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="resource">The service resource file name</param>
        /// <returns>The service resource</returns>
        public byte[] GetServiceResource(string org, string service, string resource)
        {
            byte[] fileContent = null;

            if (resource == _settings.RuleHandlerFileName)
            {
                string dynamicsPath = _settings.GetDynamicsPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                if (File.Exists(dynamicsPath + resource))
                {
                    fileContent = File.ReadAllBytes(dynamicsPath + resource);
                }
            }
            else
            {
                string serviceResourceDirectoryPath = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
                if (File.Exists(serviceResourceDirectoryPath + resource))
                {
                    fileContent = File.ReadAllBytes(serviceResourceDirectoryPath + resource);
                }
            }

            return fileContent;
        }

        /// <inheritdoc/>
        public bool UpdateServiceInformationInApplicationMetadata(string org, string applicationId, ServiceConfiguration applicationInformation)
        {
            try
            {
                ApplicationMetadata existingApplicationMetadata = GetApplicationMetadata(org, applicationId);

                if (existingApplicationMetadata.Title == null)
                {
                    existingApplicationMetadata.Title = new Dictionary<string, string>();
                }

                if (existingApplicationMetadata.Title.ContainsKey("nb-no"))
                {
                    existingApplicationMetadata.Title["nb-no"] = applicationInformation.ServiceName;
                }
                else
                {
                    existingApplicationMetadata.Title.Add("nb-no", applicationInformation.ServiceName);
                }                   

                string metadataAsJson = JsonConvert.SerializeObject(existingApplicationMetadata);
                string filePath = _settings.GetMetadataPath(org, applicationId, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ApplicationMetadataFileName;

                File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);
            }
            catch
            {
                return false;
            }

            return true;
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

        private void AddDefaultFiles(string org, string service)
        {
            // Create the service test folder
            Directory.CreateDirectory(_settings.GetTestPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

            // Create the service testdata folder
            Directory.CreateDirectory(_settings.GetTestDataPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

            // Copy default Dockerfile
            string servicePath = _settings.GetServicePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            File.Copy(_generalSettings.DefaultRepoDockerfile, servicePath + _settings.DockerfileFileName);
            File.Copy(_generalSettings.DefaultProjectFile, servicePath + _settings.ProjectFileName);
            File.Copy(_generalSettings.DefaultGitIgnoreFile, servicePath + _settings.GitIgnoreFileName);
        }

        private void CreateInitialServiceImplementation(string org, string service)
        {
            // Read the serviceImplemenation template
            string textData = File.ReadAllText(_generalSettings.ServiceImplementationTemplate, Encoding.UTF8);

            // Replace the template default namespace
            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service));

            // Create the service implementation folder
            Directory.CreateDirectory(_settings.GetImplementationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

            // Get the file path
            string serviceImplemenationFilePath = _settings.GetImplementationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceImplementationFileName;
            File.WriteAllText(serviceImplemenationFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialWorkflow(string org, string service)
        {
            // Read the workflow template
            string textData = File.ReadAllText(_generalSettings.WorkflowTemplate, Encoding.UTF8);

            // Create the workflow folder
            Directory.CreateDirectory(_settings.GetWorkflowPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

            // Get the file path
            string workflowFilePath = _settings.GetWorkflowPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.WorkflowFileName;
            File.WriteAllText(workflowFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialCalculationHandler(string org, string service)
        {
            // Read the serviceImplemenation template
            string textData = File.ReadAllText(_generalSettings.CalculateHandlerTemplate, Encoding.UTF8);

            // Replace the template default namespace
            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service));

            // Get the file path
            string calculationHandlerFilePath = _settings.GetCalculationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.CalculationHandlerFileName;
            File.WriteAllText(calculationHandlerFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialDynamicsHandler(string org, string service)
        {
            // Read the serviceImplemenation template
            string textData = File.ReadAllText(_generalSettings.RuleHandlerTemplate, Encoding.UTF8);

            // Replace the template default namespace
            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service));

            // Get the file path
            string ruleHandlerFilePath = _settings.GetDynamicsPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RuleHandlerFileName;
            File.WriteAllText(ruleHandlerFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialValidationHandler(string org, string service)
        {
            // Read the serviceImplemenation template
            string textData = File.ReadAllText(_generalSettings.ValidationHandlerTemplate, Encoding.UTF8);

            // Replace the template default namespace
            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service));

            // Get the file path
            string validationHandlerFilePath = _settings.GetValidationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ValidationHandlerFileName;
            File.WriteAllText(validationHandlerFilePath, textData, Encoding.UTF8);
        }

        private void CreateInitialInstansiationHandler(string org, string service)
        {
            // Read the serviceImplemenation template
            string textData = File.ReadAllText(_generalSettings.InstantiationHandlerTemplate, Encoding.UTF8);

            // Replace the template default namespace
            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service));

            // Get the file path
            string instansiationHandlerFilePath = _settings.GetImplementationPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.InstantiationHandlerFileName;
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

        private void CreateInitialDeploymentFiles(string org, string service)
        {
            string sourcePath = _generalSettings.DeploymentLocation;
            string targetPath = _settings.GetDeploymentPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            // Create the service deployment folder
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
        /// <param name="org">The org.</param>
        /// <param name="service">The service</param>
        /// <returns>IEnumerable loading the resources as you ask for next.</returns>
        private IEnumerable<ResourceWrapper> GetAllResources(string org, string service)
        {
            string resourcePath = _settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string[] directoryFiles = Directory.GetFiles(resourcePath);

            foreach (string resourceFile in directoryFiles)
            {
                dynamic jsonFileContent = JsonConvert.DeserializeObject<ResourceCollection>(File.ReadAllText(resourceFile));
                yield return new ResourceWrapper { FileName = resourceFile, Resources = jsonFileContent };
            }
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
