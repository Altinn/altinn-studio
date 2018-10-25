using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Xml.Linq;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using LibGit2Sharp;
using Microsoft.AspNetCore.Http;
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

    /// <summary>
    /// Initializes a new instance of the <see cref="RepositorySI"/> class 
    /// </summary>
    /// <param name="repositorySettings">The settings for the service repository</param>
    /// <param name="generalSettings">The current general settings</param>
    /// <param name="defaultFileFactory">The default factory</param>
    public RepositorySI(IOptions<ServiceRepositorySettings> repositorySettings,
        IOptions<GeneralSettings> generalSettings, IDefaultFileFactory defaultFileFactory, IHttpContextAccessor httpContextAccessor, IGitea gitea, ISourceControl sourceControl)
    {
      _defaultFileFactory = defaultFileFactory;
      _settings = repositorySettings.Value;
      _generalSettings = generalSettings.Value;
      _httpContextAccessor = httpContextAccessor;
      _gitea = gitea;
      _sourceControl = sourceControl;
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
      string servicePath = serviceOrgPath + "/" + serviceMetadata.Service;

      if (!Directory.Exists(serviceOrgPath))
      {
        Directory.CreateDirectory(serviceOrgPath);
      }

      if (!Directory.Exists(servicePath))
      {
        Directory.CreateDirectory(servicePath);
      }

      var metaDataDir = _settings.GetMetadataPath(serviceMetadata.Org,
          serviceMetadata.Service, serviceMetadata.Edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
      var metaDirectoryInfo = new DirectoryInfo(metaDataDir);
      if (!metaDirectoryInfo.Exists)
      {
        metaDirectoryInfo.Create();
      }

      var resourceDir = _settings.GetResourcePath(serviceMetadata.Org,
          serviceMetadata.Service, serviceMetadata.Edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
      var resourceDirectoryInfo = new DirectoryInfo(resourceDir);
      if (!resourceDirectoryInfo.Exists)
      {
        resourceDirectoryInfo.Create();
      }


      var filePath = metaDataDir + _settings.ServiceMetadataFileName;
      File.WriteAllText(filePath, metadataAsJson, Encoding.UTF8);

      AddDefaultFiles(serviceMetadata.Org, serviceMetadata.Service, serviceMetadata.Edition);
      CreateInitialServiceImplementation(serviceMetadata.Org, serviceMetadata.Service, serviceMetadata.Edition);
      CreateInitialCalculationHandler(serviceMetadata.Org, serviceMetadata.Service, serviceMetadata.Edition);
      CreateInitialValidationHandler(serviceMetadata.Org, serviceMetadata.Service, serviceMetadata.Edition);
      CreateInitialInstansiationHandler(serviceMetadata.Org, serviceMetadata.Service, serviceMetadata.Edition);
      CreateInitialRuleHandler(serviceMetadata.Org, serviceMetadata.Service, serviceMetadata.Edition);
      CreateInitialWorkflow(serviceMetadata.Org, metaDirectoryInfo);
      CreateInitialWebApp(serviceMetadata.Org, resourceDirectoryInfo);
      CreateInitialStyles(serviceMetadata.Org, resourceDirectoryInfo);
      return true;
    }

    /// <summary>
    /// Updates serviceMetadata
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="serviceMetadata">The service Metadata</param>
    /// <returns>A boolean indicating if saving was ok</returns>
    public bool UpdateServiceMetadata(string org, string service, string edition, ServiceMetadata serviceMetadata)
    {
      try
      {
        string metadataAsJson = JsonConvert.SerializeObject(serviceMetadata);
        string filePath = _settings.GetMetadataPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceMetadataFileName;

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
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>The service metadata for a service</returns>
    public ServiceMetadata GetServiceMetaData(string org, string service, string edition)
    {
      string filename = _settings.GetMetadataPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceMetadataFileName;
      string filedata = File.ReadAllText(filename, Encoding.UTF8);

      return JsonConvert.DeserializeObject<ServiceMetadata>(filedata);
    }

    #endregion


    /// <summary>
    /// Returns the content of a configuration file
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="name">The name of the configuration</param>
    /// <returns>A string containing the file content</returns>
    public string GetConfiguration(string org, string service, string edition, string name)
    {
      string filename = _settings.GetMetadataPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + name;
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
    /// <returns>The resource file content</returns>
    public string GetResource(string org, string service, string edition, string id)
    {
      string filename = _settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"resource.{id}.json";
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
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>The text</returns>
    public Dictionary<string, Dictionary<string, string>> GetServiceTexts(string org, string service, string edition)
    {
      Dictionary<string, Dictionary<string, string>> serviceTextsAllLanguages =
          new Dictionary<string, Dictionary<string, string>>();

      // Get service level text resources
      string resourcePath = _settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
      serviceTextsAllLanguages = GetResourceTexts(resourcePath, serviceTextsAllLanguages);

      //Get Org level text resources
      string orgResourcePath = _settings.GetOrgTextResourcePath(org, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
      serviceTextsAllLanguages = GetResourceTexts(orgResourcePath, serviceTextsAllLanguages);

      //Get altinn common level text resources
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
    /// Returns the edition languages
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>The text</returns>
    public List<string> GetLanguages(string org, string service, string edition)
    {
      List<string> languages = new List<string>();

      string resourcePath = _settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="texts">The texts to be saved</param>
    public void SaveServiceTexts(string org, string service, string edition,
        Dictionary<string, Dictionary<string, string>> texts)
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
            var textObject = new JObject
                        {
                            new JProperty("id", text.Key),
                            new JProperty("value", localizedText.Value)
                        };
            resourceTextsAsJson[localizedText.Key].Add(text.Key, textObject);
          }
        }
      }

      string resourcePath = _settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

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
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>Returns the Xsd object as a string</returns>
    public string GetXsdModel(string org, string service, string edition)
    {
      string filename = _settings.GetModelPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelXSDFileName;
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
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>Returns the json object as a string</returns>
    public string GetJsonFormLayout(string org, string service, string edition)
    {
      string filePath = _settings.GetFormLayoutPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.FormLayoutJSONFileName;
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
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>Returns the json object as a string</returns>
    public string GetJsonThirdPartyComponents(string org, string service, string edition)
    {
      string filePath = _settings.GetThirdPartyComponentsPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ThirdPartyComponentsJSONFileName;
      string fileData = null;

      if (File.Exists(filePath))
      {
        fileData = File.ReadAllText(filePath, Encoding.UTF8);
      }

      return fileData;
    }

    /// <summary>
    /// Get the Json form model from disk
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>Returns the json object as a string</returns>
    public string GetRuleHandler(string org, string service, string edition)
    {
      string filePath = _settings.GetRuleHandlerPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RuleHandlerFileName;
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="fileName">The filename so read from</param>
    /// <returns>Returns the json object as a string</returns>
    public string GetJsonFile(string org, string service, string edition, string fileName)
    {
      string filePath = _settings.GetFormLayoutPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + "/Resources/" + fileName;
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="resource">The content of the resource file</param>
    /// <returns>A boolean indicating if saving was ok</returns>
    public bool SaveJsonFormLayout(string org, string service, string edition, string resource)
    {
      string filePath = _settings.GetFormLayoutPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.FormLayoutJSONFileName;
      (new FileInfo(filePath)).Directory.Create();
      File.WriteAllText(filePath, resource, Encoding.UTF8);

      return true;
    }

    /// <summary>
    /// Save the JSON third party components to disk
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="resource">The content of the resource file</param>
    /// <returns>A boolean indicating if saving was ok</returns>
    public bool SaveJsonThirdPartyComponents(string org, string service, string edition, string resource)
    {
      string filePath = _settings.GetFormLayoutPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ThirdPartyComponentsJSONFileName;
      (new FileInfo(filePath)).Directory.Create();
      File.WriteAllText(filePath, resource, Encoding.UTF8);

      return true;
    }

    /// <summary>
    /// Save the JSON file to disk
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="resource">The content of the resource file</param>
    /// <returns>A boolean indicating if saving was ok</returns>
    public bool SaveJsonFile(string org, string service, string edition, string resource, string fileName)
    {
      string filePath = _settings.GetFormLayoutPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + "/Resources/" + fileName;
      (new FileInfo(filePath)).Directory.Create();
      File.WriteAllText(filePath, resource, Encoding.UTF8);

      return true;
    }

    /// <summary>
    /// Gets the raw content of a code list
    /// </summary>
    /// <param name="org">The organization code of the service owner</param>
    /// <param name="service">The service code of the current service</param>
    /// <param name="edition">The edition code of the current service</param>
    /// <param name="name">The name of the code list to retrieve</param>
    /// <returns>Raw contents of a code list file</returns>
    public string GetCodelist(string org, string service, string edition, string name)
    {
      try
      {
        Dictionary<string, string> allCodelists = GetCodelists(org, service, edition);

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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="name">The name on config</param>
    /// <param name="config">The content</param>
    /// <returns>A boolean indicating if everything went ok</returns>
    public bool SaveConfiguration(string org, string service, string edition, string name, string config)
    {

      string filePath = _settings.GetMetadataPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + name;
      (new FileInfo(filePath)).Directory.Create();
      File.WriteAllText(filePath, config, Encoding.UTF8);

      return true;
    }

    /// <summary>
    /// Stores the resource for a given language id
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
    /// <param name="resource">The content of the resource file</param>
    /// <returns>A boolean indicating if saving was ok</returns>
    public bool SaveResource(string org, string service, string edition, string id, string resource)
    {
      string filePath = _settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + $"resource.{id}.json";
      (new FileInfo(filePath)).Directory.Create();
      File.WriteAllText(filePath, resource, Encoding.UTF8);

      return true;
    }



    /// <summary>
    /// Deletes the language resource for a given language id
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
    /// <returns>A boolean indicating if the delete was a success</returns>
    public bool DeleteLanguage(string org, string service, string edition, string id)
    {
      string filename = string.Format(_settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext))) + $"resource.{id}.json";
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="serviceMetadata">The service metadata to generate the model based on</param>
    /// <param name="mainXsd">The main XSD for the current service</param>
    /// <returns>A value indicating if everything went ok</returns>
    public bool CreateModel(string org, string service, string edition, ServiceMetadata serviceMetadata,
        XDocument mainXsd)
    {
      var modelGenerator = new JsonMetadataParser();

      serviceMetadata.Org = org;
      serviceMetadata.Service = service;
      serviceMetadata.Edition = edition;

      string classes = modelGenerator.CreateModelFromMetadata(serviceMetadata);

      // Update the service metadata with all elements
      ServiceMetadata original = GetServiceMetaData(org, service, edition);
      string oldRoot = original.Elements?.Values.First(e => e.ParentElement == null).TypeName;
      original.Elements = serviceMetadata.Elements;

      if (!UpdateServiceMetadata(org, service, edition, original))
      {
        return false;
      }

      // Create the .cs file for the model
      try
      {
        string filePath = _settings.GetModelPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelFileName;
        (new FileInfo(filePath)).Directory.Create();
        File.WriteAllText(filePath, classes, Encoding.UTF8);
      }
      catch
      {
        return false;
      }

      if (mainXsd != null)
      {
        {
          // Create the .xsd file for the model
          try
          {
            string filePath = _settings.GetModelPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelXSDFileName;
            (new FileInfo(filePath)).Directory.Create();
            File.WriteAllText(filePath, mainXsd.ToString(), Encoding.UTF8);
          }
          catch
          {
            return false;
          }
        }
      }

      var resourceDirectory = _settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
      if (!Directory.Exists(resourceDirectory))
      {
        throw new Exception("Resource directory missing.");
      }

      string ruleHandlerPath = resourceDirectory + _settings.RuleHandlerFileName;
      File.WriteAllText(
          ruleHandlerPath,
          File.ReadAllText(ruleHandlerPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, original.Elements.Values.First(el => el.ParentElement == null).TypeName));

      var implementationDirectory = _settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
      if (!Directory.Exists(implementationDirectory))
      {
        throw new Exception("Implementation directory missing.");
      }

      // Update the service implementation class with the correct model type name
      string serviceImplementationPath = implementationDirectory + _settings.ServiceImplementationFileName;
      File.WriteAllText(
          serviceImplementationPath,
          File.ReadAllText(serviceImplementationPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, original.Elements.Values.First(el => el.ParentElement == null).TypeName));

      string calculationHandlerPath = implementationDirectory + _settings.CalculationHandlerFileName;
      File.WriteAllText(
          calculationHandlerPath,
          File.ReadAllText(calculationHandlerPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, original.Elements.Values.First(el => el.ParentElement == null).TypeName));

      string validationHandlerPath = implementationDirectory + _settings.ValidationHandlerFileName;
      File.WriteAllText(
          validationHandlerPath,
          File.ReadAllText(validationHandlerPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, original.Elements.Values.First(el => el.ParentElement == null).TypeName));

      string instansiationHandlerPath = implementationDirectory + _settings.InstantiationHandlerFileName;
      File.WriteAllText(
          instansiationHandlerPath,
          File.ReadAllText(instansiationHandlerPath).Replace(oldRoot ?? CodeGeneration.DefaultServiceModelName, original.Elements.Values.First(el => el.ParentElement == null).TypeName));

      return true;
    }

    /// <summary>
    /// Gets the content of the service model as string
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>Service model content</returns>
    public string GetServiceModel(string org, string service, string edition)
    {
      string filename = _settings.GetModelPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceModelFileName;
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
          string[] editions = Directory.GetDirectories(serviceRepo);

          foreach (string edition in editions)
          {
            string serviceDirectory = _settings.GetMetadataPath(serviceOwnerFileName, serviceRepoFileName, Path.GetFileName(edition), AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            if (Directory.Exists(serviceDirectory))
            {
              services.Add(GetServiceMetaData(serviceOwnerFileName, serviceRepoFileName, Path.GetFileName(edition)));
            }
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
    /// Creates a new service owner folder in the repository location and saves the given configuration
    /// </summary>
    /// <param name="ownerConfig">The service owner configuration</param>
    /// <returns>Was the creation successful</returns>
    public bool CreateOrg(OrgConfiguration ownerConfig)
    {
      string filename = _settings.GetOrgPath(ownerConfig.Code) + ownerConfig.Code + "/config.json";
      bool created = false;

      if (!File.Exists(filename))
      {
        (new FileInfo(filename)).Directory.Create();
        using (Stream fileStream = new FileStream(filename, FileMode.Create, FileAccess.ReadWrite))
        using (StreamWriter streamWriter = new StreamWriter(fileStream))
        {
          streamWriter.WriteLine(JsonConvert.SerializeObject(ownerConfig));
        }

        created = true;
      }

      return created;
    }

    /// <summary>
    /// Creates a new service folder under the given <paramref name="org">service owner</paramref> and saves the
    /// given <paramref name="serviceConfig"/>
    /// </summary>
    /// <param name="org">The service owner to create the new service under</param>
    /// <param name="serviceConfig">The service configuration to save</param>
    /// <returns>Was the service creation successful</returns>
    public bool CreateService(string org, ServiceConfiguration serviceConfig)
    {
      string filename = _settings.GetServicePath(org, serviceConfig.Code, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + "config.json";

      RepositoryClient.Model.CreateRepoOption createRepoOption = new RepositoryClient.Model.CreateRepoOption(Name: serviceConfig.Code, Readme: "Tjenestedata", Description: "Dette er en test");


      AltinnCore.RepositoryClient.Model.Repository repository = CreateRepository(org, createRepoOption);
      _sourceControl.CloneRemoteRepository(org, serviceConfig.Code);

      bool created = false;

      if (!File.Exists(filename))
      {
        // Verify if directory exist. Should Exist if Cloning of new repository worked
        if (!(new FileInfo(filename)).Directory.Exists)
        {
          (new FileInfo(filename)).Directory.Create();
        }

        using (Stream fileStream = new FileStream(filename, FileMode.Create, FileAccess.ReadWrite))
        using (StreamWriter streamWriter = new StreamWriter(fileStream))
        {
          streamWriter.WriteLine(JsonConvert.SerializeObject(serviceConfig));
        }

        created = true;
      }

      CommitInfo commitInfo = new CommitInfo() { Org = org, Repository = serviceConfig.Code, Message = "Service Created" };

      _sourceControl.PushChangesForRepository(commitInfo);

      return created;
    }

    /// <summary>
    /// Creates a new service edition folder under the given <paramref name="org">service owner</paramref> and <paramref name="service">service</paramref>,
    /// and saves the given <paramref name="serviceEditionConfiguration"/>
    /// </summary>
    /// <param name="org">The service owner to create the new service edition under</param>
    /// <param name="service">The service to create the new service edition under</param>
    /// <param name="editionConfig">The service edition configuration to save</param>
    /// <returns>Was the service edition creation successful</returns>
    public bool CreateEdition(string org, string service, EditionConfiguration editionConfig)
    {
      string serviceEditionPath = _settings.GetEditionPath(org, service, editionConfig.Code, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + "/config.json";
      
      if (Directory.Exists(serviceEditionPath))
      {
        return false;
      }

      (new FileInfo(serviceEditionPath)).Directory.Create();
      using (Stream fileStream = new FileStream(serviceEditionPath, FileMode.Create, FileAccess.ReadWrite))
      using (StreamWriter streamWriter = new StreamWriter(fileStream))
      {
        streamWriter.WriteLine(JsonConvert.SerializeObject(editionConfig));
      }

      return true;
    }

    /// <summary>
    /// Delete a service edition from disk
    /// </summary>
    /// <param name="org">The service owner to delete the service edition from</param>
    /// <param name="service">The service to delete the service edition from</param>
    /// <param name="edition">The service edition to delete</param>
    /// <returns>true if success, false otherwise</returns>
    public bool DeleteEdition(string org, string service, string edition)
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
          if (!string.IsNullOrEmpty(edition))
          {
            directoryPath += "/editions/" + edition;
          }
        }
        else
        {
          directoryPath += "/" + org;
        }

        var directoryInfo = new DirectoryInfo(directoryPath);
        foreach (var file in directoryInfo.GetFiles())
        {
          file.Delete();
        }

        foreach (var directory in directoryInfo.GetDirectories())
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
            var textData = File.ReadAllText(serviceRepo + "/config.json");
            services.Add(JsonConvert.DeserializeObject<ServiceConfiguration>(textData));
          }
        }
      }

      return services;
    }

    /// <summary>
    /// Returns a list of all service editions for a given service
    /// </summary>
    /// <param name="org">The service owner the service belongs to</param>
    /// <param name="service">The code of the service to get editions for</param>
    /// <returns>A list of all service editions for the given service</returns>
    public IList<EditionConfiguration> GetEditions(string org, string service)
    {
      List<EditionConfiguration> editions = new List<EditionConfiguration>();
      string path = _settings.GetServicePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + "/" + General.EditionsFolder;

      if (Directory.Exists(path))
      {
        string[] editionFolders = Directory.GetDirectories(path);

        foreach (string editionFolder in editionFolders)
        {
          if (File.Exists(editionFolder + "/config.json"))
          {
            var textData = File.ReadAllText(editionFolder + "/config.json");
            editions.Add(JsonConvert.DeserializeObject<EditionConfiguration>(textData));
          }
        }
      }

      return editions;
    }

    /// <summary>
    /// Gets all service packages for the given service
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>A list of all service packages created for the given service </returns>
    public IList<ServicePackageDetails> GetServicePackages(string org, string service, string edition)
    {
      Guard.AssertOrgServiceEdition(org, service, edition);
      var packageDetails = new List<ServicePackageDetails>();
      string packageDirectory = _settings.GetServicePackagesPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

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
    /// The get zip archive.
    /// </summary>
    /// <param name="servicePackageDetails">
    /// The service package details. Expect PackageName to be the file name.
    /// </param>
    /// <returns>
    /// The <see cref="ZipArchive"/>.
    /// </returns>
    public ZipArchive GetZipArchive(ServicePackageDetails details)
    {
      Guard.AssertArgumentNotNull(details, nameof(details));
      string packageDirectory = _settings.GetServicePackagesPath(details.Organization, details.Service, details.Edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
      string filename = packageDirectory + details.PackageName;

      if (!File.Exists(filename))
      {
        throw new ArgumentException("Package detail file does not exist", nameof(details));
      }

      return ZipFile.OpenRead(filename);
    }

    /// <summary>
    /// Updates rules for a service
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="rules">The rules to save</param>
    /// <returns>A boolean indicating if saving was ok</returns>
    public bool UpdateRules(string org, string service, string edition, List<RuleContainer> rules)
    {
      try
      {
        Directory.CreateDirectory(_settings.GetRulesPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
        string rulesAsJson = JsonConvert.SerializeObject(rules);
        string filePath = _settings.GetRulesPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RulesFileName;

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
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>The rules for a service</returns>
    public List<RuleContainer> GetRules(string org, string service, string edition)
    {
      string filename = _settings.GetRulesPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RulesFileName;
      List<RuleContainer> rules = null;

      if (File.Exists(filename))
      {
        string textData = File.ReadAllText(filename, Encoding.UTF8);
        rules = JsonConvert.DeserializeObject<List<RuleContainer>>(textData);
      }

      return rules;
    }

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

        using (var repo = new Repository(localServiceRepoFolder))
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
      }

      RepositoryClient.Model.CreateRepoOption createRepoOption = new RepositoryClient.Model.CreateRepoOption(Name: Constants.General.CodeListRepository, Readme: "Kodelister", Description: "Dette er repository for kodelister for " + org);
      CreateRepository(org, createRepoOption);

      try
      {
        _sourceControl.CloneRemoteRepository(org, Constants.General.CodeListRepository);
      }
      catch (Exception ex)
      {
      }
    }

    private string GetCodeListRepoForOrg(string org)
    {
      // TODO: FIND OUT WHAT SHOULD BE HERE
      return $"http://altinn3.no/{org}/codelists.git";
    }
    public AltinnCore.RepositoryClient.Model.Repository CreateRepository(string org, AltinnCore.RepositoryClient.Model.CreateRepoOption createRepoOption)
    {
      return _gitea.CreateRepositoryForOrg(AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName), org, createRepoOption).Result;
    }

    /// <summary>
    /// Gets all code lists at service owner, service or service edition level
    /// </summary>
    /// <param name="org">The service owner code of the service owner to get code lists for</param>
    /// <param name="service">The service code of the service to get code lists for</param>
    /// <param name="edition">The service edition code of the edition to get code lists for</param>
    /// <returns>All code lists for at the given location</returns>
    public Dictionary<string, string> GetCodelists(string org, string service, string edition)
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
        if (!string.IsNullOrEmpty(edition))
        {
          codelistDirectoryPath += "/editions/" + edition;
        }
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="name">The name on config</param>
    /// <param name="codeList">The content</param>
    /// <returns>A boolean indicating if the code list was successfully saved</returns>
    public bool SaveCodeList(string org, string service, string edition, string name, string codeList)
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
          if (!string.IsNullOrEmpty(edition))
          {
            filePath += "/editions/" + edition;
          }
        }

        filePath += $"/codelists/{name}.json";

        (new FileInfo(filePath)).Directory.Create();
        File.WriteAllText(filePath, codeList, Encoding.UTF8);
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="name">The name on config</param>
    /// <returns>A boolean indicating if the Code List was deleted</returns>
    public bool DeleteCodeList(string org, string service, string edition, string name)
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
          if (!string.IsNullOrEmpty(edition))
          {
            filePath += "/" + edition;
          }
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="name">The name of the view</param>
    public void DeleteTextResource(string org, string service, string edition, string name)
    {
      Guard.AssertArgumentNotNullOrWhiteSpace(name, nameof(name));
      var resourceTextKey = ViewResourceKey(name);

      var resources = GetAllResources(org, service, edition);
      foreach (var resource in resources)
      {
        var jsonFileContent = resource.Resources;
        var itemsToDelete = jsonFileContent?.Resources.Where(v => resourceTextKey == v?.Id).ToList();

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
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>A list of file names</returns>
    public List<AltinnCoreFile> GetImplementationFiles(string org, string service, string edition)
    {
      List<AltinnCoreFile> coreFiles = new List<AltinnCoreFile>();

      string[] files = Directory.GetFiles(_settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
      foreach (string file in files)
      {
        var corefile = new AltinnCoreFile
        {
          FilePath = file,
          FileName = Path.GetFileName(file),
          LastChanged = File.GetLastWriteTime(file)
        };

        coreFiles.Add(corefile);
      }

      string[] modelFiles = Directory.GetFiles(_settings.GetModelPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
      foreach (string file in modelFiles)
      {
        var corefile = new AltinnCoreFile
        {
          FilePath = file,
          FileName = System.IO.Path.GetFileName(file),
          LastChanged = File.GetLastWriteTime(file)
        };

        coreFiles.Add(corefile);
      }

      string[] jsFiles = Directory.GetFiles(_settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
      foreach (string file in jsFiles)
      {
        if (System.IO.Path.GetFileName(file) == "RuleHandler.js")
        {
          var corefile = new AltinnCoreFile
          {
            FilePath = file,
            FileName = System.IO.Path.GetFileName(file),
            LastChanged = File.GetLastWriteTime(file)
          };

          coreFiles.Add(corefile);
        }
      }

      return coreFiles;
    }

    /// <summary>
    /// Returns content of a implementation file
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="fileName">The file Name</param>
    /// <returns>The file content</returns>
    public string GetImplementationFile(string org, string service, string edition, string fileName)
    {
      string filename = _settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="fileName">The file Name</param>
    /// <returns>The file content</returns>
    public string GetResourceFile(string org, string service, string edition, string fileName)
    {
      string filename = _settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="fileName">The fileName</param>
    /// <param name="fileContent">The file content</param>
    public void SaveImplementationFile(string org, string service, string edition, string fileName, string fileContent)
    {
      string filename = _settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
      File.WriteAllText(filename, fileContent, Encoding.UTF8);
    }

    /// <summary>
    /// Saving a resouce file
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="fileName">The fileName</param>
    /// <param name="fileContent">The file content</param>
    public void SaveResourceFile(string org, string service, string edition, string fileName, string fileContent)
    {
      string filename = _settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + fileName;
      File.WriteAllText(filename, fileContent, Encoding.UTF8);
    }

    /// <summary>
    /// Returns a list of workflow steps
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <returns>A list of workflow steps</returns>
    public List<WorkFlowStep> GetWorkFlow(string org, string service, string edition)
    {
      string filename = _settings.GetMetadataPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.WorkFlowFileName;
      string textData = File.ReadAllText(filename, Encoding.UTF8);

      return JsonConvert.DeserializeObject<List<WorkFlowStep>>(textData);
    }

    /// <summary>
    /// The add view name text resource.
    /// "view." + viewName for each text resource in the service/edition
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="viewMetadatas"> The view metadata list. </param>
    public void AddViewNameTextResource(string org, string service, string edition, IEnumerable<ViewMetadata> viewMetadatas)
    {
      Guard.AssertOrgServiceEdition(org, service, edition);
      Guard.AssertArgumentNotNull(viewMetadatas, nameof(viewMetadatas));

      var resourceKeys = viewMetadatas.Where(v => !string.IsNullOrWhiteSpace(v?.Name)).Select(v => ViewResourceKey(v.Name)).ToList();
      if (!resourceKeys.Any())
      {
        return;
      }

      var resourceList = GetAllResources(org, service, edition);
      foreach (var res in resourceList)
      {
        var resources = res.Resources;
        if (resources == null)
        {
          throw new NullReferenceException("Deserialized resources null");
        }

        var currentKeys = resources.Resources.Select(k => k.Id).ToList();
        var missingViewKeys = resourceKeys.Except(currentKeys).ToList();

        if (missingViewKeys.Any())
        {
          missingViewKeys.ForEach(k => resources.Add(k, string.Empty));
          Save(res);
        }
      }
    }

    /// <summary>
    /// Updates the view name text resource.
    /// "view." + viewName for each text resource in the service/edition
    /// </summary>
    /// <param name="org">The Organization code for the service owner</param>
    /// <param name="service">The service code for the current service</param>
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="currentName">Current / old view name</param>
    /// <param name="newName">the new view name</param>
    public void UpdateViewNameTextResource(string org, string service, string edition, string currentName, string newName)
    {
      Guard.AssertArgumentNotNullOrWhiteSpace(currentName, nameof(currentName));
      Guard.AssertArgumentNotNullOrWhiteSpace(newName, nameof(newName));

      var currentKey = ViewResourceKey(currentName);
      var newKey = ViewResourceKey(newName);

      var resources = GetAllResources(org, service, edition);
      foreach (var resource in resources)
      {
        var itemsToUpdate = resource.FilterById(currentKey).ToList();
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
    /// <param name="edition">The edition code for the current service</param>
    /// <param name="resource">The service resource file name</param>
    /// <returns></returns>
    public byte[] GetServiceResource(string org, string service, string edition, string resource)
    {
      byte[] fileContent = null;
      string serviceResourceDirectoryPath = null;
      if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
      {
        serviceResourceDirectoryPath = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + "/" + org;
      }
      else
      {
        serviceResourceDirectoryPath = _settings.RepositoryLocation + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + "/" + org;
      }

      if (!string.IsNullOrEmpty(service))
      {
        serviceResourceDirectoryPath += "/" + service;
        if (!string.IsNullOrEmpty(edition))
        {
          serviceResourceDirectoryPath += "/editions/" + edition;
        }
      }
      else
      {
        serviceResourceDirectoryPath += "/" + org;
      }

      serviceResourceDirectoryPath += "/resources/";

      if (File.Exists(serviceResourceDirectoryPath + resource))
      {
        fileContent = File.ReadAllBytes(serviceResourceDirectoryPath + resource);
      }

      return fileContent;

    }

    private void CheckAndCreateDeveloperFolder()
    {
      string path = null;
      if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
      {
        path = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + "/";
      }
      else
      {
        path = _settings.RepositoryLocation + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + "/";
      }

      if (!Directory.Exists(path))
      {
        Directory.CreateDirectory(path);
      }
    }


    private static string ViewResourceKey(string viewName)
    {
      return $"view.{viewName}";
    }

    private static void Save(ResourceWrapper resourceWrapper)
    {
      var textContent = JsonConvert.SerializeObject(resourceWrapper.Resources, Formatting.Indented);
      File.WriteAllText(resourceWrapper.FileName, textContent);
    }

    private void AddDefaultFiles(string org, string service, string edition)
    {
      // Read the serviceImplemenation template
      string defaultLayoutContent = File.ReadAllText(_generalSettings.DefaultServiceLayout, Encoding.UTF8);

      // Create the edition views folder
      Directory.CreateDirectory(_settings.GetViewPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

      // Create the edition test folder
      Directory.CreateDirectory(_settings.GetTestPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

      // Create the edition testdata folder
      Directory.CreateDirectory(_settings.GetTestDataPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

      // Get the file path
      string defaultViewFilePath = _settings.GetViewPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

      // Copy default view start to the service view directory
      File.Copy(_generalSettings.DefaultViewStart, defaultViewFilePath + _settings.DefaultViewStartFileName);
      File.Copy(_generalSettings.DefaultViewImports, defaultViewFilePath + _settings.DefaultViewImportsFileName);

      // Copy default Dockerfile
      string editionPath = _settings.GetEditionPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
      File.Copy(_generalSettings.DefaultRepoDockerfile, editionPath + _settings.DockerfileFileName);

      // Copy All default template files
      IEnumerable<string> templates = Directory.EnumerateFiles(_generalSettings.TemplateLocation);
      foreach (string template in templates)
      {
        if (template.Contains("Layout"))
        {
          File.Copy(template, defaultViewFilePath + Path.GetFileName(template));
        }
      }
    }

    private void CreateInitialServiceImplementation(string org, string service, string edition)
    {
      // Read the serviceImplemenation template
      string textData = File.ReadAllText(_generalSettings.ServiceImplementationTemplate, Encoding.UTF8);

      // Replace the template default namespace
      textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service, edition));

      // Create the service implementation folder
      Directory.CreateDirectory(_settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

      // Get the file path
      string serviceImplemenationFilePath = _settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ServiceImplementationFileName;
      File.WriteAllText(serviceImplemenationFilePath, textData, Encoding.UTF8);
    }

    private void CreateInitialCalculationHandler(string org, string service, string edition)
    {
      // Read the serviceImplemenation template
      string textData = File.ReadAllText(_generalSettings.CalculateHandlerTemplate, Encoding.UTF8);

      // Replace the template default namespace
      textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service, edition));

      // Get the file path
      string calculationHandlerFilePath = _settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.CalculationHandlerFileName;
      File.WriteAllText(calculationHandlerFilePath, textData, Encoding.UTF8);
    }

    private void CreateInitialRuleHandler(string org, string service, string edition)
    {
      // Read the serviceImplemenation template
      string textData = File.ReadAllText(_generalSettings.RuleHandlerTemplate, Encoding.UTF8);

      // Replace the template default namespace
      textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service, edition));

      // Get the file path
      string ruleHandlerFilePath = _settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.RuleHandlerFileName;
      File.WriteAllText(ruleHandlerFilePath, textData, Encoding.UTF8);
    }

    private void CreateInitialValidationHandler(string org, string service, string edition)
    {
      // Read the serviceImplemenation template
      string textData = File.ReadAllText(_generalSettings.ValidationHandlerTemplate, Encoding.UTF8);

      // Replace the template default namespace
      textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service, edition));

      // Get the file path
      string validationHandlerFilePath = _settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.ValidationHandlerFileName;
      File.WriteAllText(validationHandlerFilePath, textData, Encoding.UTF8);
    }

    private void CreateInitialInstansiationHandler(string org, string service, string edition)
    {
      // Read the serviceImplemenation template
      string textData = File.ReadAllText(_generalSettings.InstantiationHandlerTemplate, Encoding.UTF8);

      // Replace the template default namespace
      textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service, edition));

      // Get the file path
      string validationHandlerFilePath = _settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.InstantiationHandlerFileName;
      File.WriteAllText(validationHandlerFilePath, textData, Encoding.UTF8);
    }

    private void CreateInitialWorkflow(string org, DirectoryInfo targetDirectory)
    {
      var destFileName = Path.Combine(targetDirectory.FullName, _settings.WorkFlowFileName);
      if (File.Exists(destFileName))
      {
        return;
      }

      var sourceFile = _defaultFileFactory.GetJsonDefaultFile(_settings.WorkFlowFileName, org);
      if (sourceFile != null && sourceFile.Exists)
      {
        sourceFile.CopyTo(destFileName);
      }
    }

    private void CreateInitialWebApp(string org, DirectoryInfo targetDirectory)
    {
      var destFileName = Path.Combine(targetDirectory.FullName, _settings.ReactAppFileName);
      if (File.Exists(destFileName))
      {
        return;
      }

      var sourceFile = _defaultFileFactory.GetWebAppDefaultFile(_settings.ReactAppFileName, org);
      if (sourceFile != null && sourceFile.Exists)
      {
        sourceFile.CopyTo(destFileName);
      }
    }

    private void CreateInitialStyles(string org, DirectoryInfo targetDirectory)
    {
      var destFileName = Path.Combine(targetDirectory.FullName, _settings.ReactAppCssFileName);
      if (!File.Exists(destFileName))
      {
        var sourceFile = _defaultFileFactory.GetWebAppStyleDefaultFile(_settings.ReactAppCssFileName, org);
        if (sourceFile != null && sourceFile.Exists)
        {
          sourceFile.CopyTo(destFileName);
        }
      }

      var stylesConfig = new StylesConfig();
      stylesConfig.InternalStyles = new List<string>();
      stylesConfig.InternalStyles.Add(_settings.ReactAppCssFileName);
      stylesConfig.ExternalStyles = new List<string>();
      stylesConfig.ExternalStyles.Add(_settings.DefaultBootstrapUrl);

      string output = JsonConvert.SerializeObject(stylesConfig);
      string stylesConfigPath = Path.Combine(targetDirectory.FullName, _settings.ServiceStylesConfigFileName);
      if (!File.Exists(stylesConfigPath))
      {
        File.WriteAllText(stylesConfigPath, output);
      }
    }

    /// <summary>
    /// A dictionary, where the full filename is key, and the value is a deserialized ResourceCollection
    /// </summary>
    /// <param name="org">The org.</param>
    /// <param name="service">The service</param>
    /// <param name="edition">The edition</param>
    /// <returns>IEnumerable loading the resources as you ask for next.</returns>
    private IEnumerable<ResourceWrapper> GetAllResources(string org, string service, string edition)
    {
      string resourcePath = _settings.GetResourcePath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
      string[] directoryFiles = Directory.GetFiles(resourcePath);

      foreach (string resourceFile in directoryFiles)
      {
        var jsonFileContent = JsonConvert.DeserializeObject<ResourceCollection>(File.ReadAllText(resourceFile));
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

    private class StylesConfig
    {
      public List<string> InternalStyles { get; set; }

      public List<string> ExternalStyles { get; set; }
    }
  }
}
