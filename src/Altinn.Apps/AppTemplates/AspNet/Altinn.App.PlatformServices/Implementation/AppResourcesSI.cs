using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// App implementation of the execution service needed for executing an Altinn Core Application (Functional term).
    /// </summary>
    public class AppResourcesSI : IAppResources
    {
        private readonly AppSettings _settings;
        private readonly IWebHostEnvironment _hostingEnvironment;
        private readonly ILogger _logger;
        private Application _application;

        /// <summary>
        /// Initializes a new instance of the <see cref="AppResourcesSI"/> class.
        /// </summary>
        /// <param name="settings">The app repository settings.</param>
        /// <param name="hostingEnvironment">The hosting environment</param>
        /// <param name="logger">A logger from the built in logger factory.</param>
        public AppResourcesSI(
            IOptions<AppSettings> settings,
            IWebHostEnvironment hostingEnvironment,
            ILogger<AppResourcesSI> logger)
        {
            _settings = settings.Value;
            _hostingEnvironment = hostingEnvironment;
            _logger = logger;
        }

        /// <inheritdoc/>
        public byte[] GetAppResource(string org, string app, string resource)
        {
            byte[] fileContent = null;

            if (resource == _settings.RuleHandlerFileName)
            {
                fileContent = ReadFileContentsFromLegalPath(_settings.AppBasePath + _settings.UiFolder, resource);
            }
            else if (resource == _settings.FormLayoutJSONFileName)
            {
                fileContent = ReadFileContentsFromLegalPath(_settings.AppBasePath + _settings.UiFolder, resource);
            }
            else if (resource == _settings.RuleConfigurationJSONFileName)
            {
                fileContent = ReadFileContentsFromLegalPath(_settings.AppBasePath + _settings.UiFolder, resource);

                if (fileContent == null)
                {
                    fileContent = new byte[0];
                }
            }
            else
            {
                fileContent = ReadFileContentsFromLegalPath(_settings.AppBasePath + _settings.GetResourceFolder(), resource);
            }

            return fileContent;
        }

        /// <inheritdoc />
        public byte[] GetText(string org, string app, string textResource)
        {
            return ReadFileContentsFromLegalPath(_settings.AppBasePath + _settings.ConfigurationFolder + _settings.TextFolder, textResource);
        }

        /// <inheritdoc />
        public async Task<TextResource> GetTexts(string org, string app, string language)
        {
            string pathTextsFolder = _settings.AppBasePath + _settings.ConfigurationFolder + _settings.TextFolder;
            string fullFileName = Path.Join(pathTextsFolder, $"resource.{language}.json");

            PathHelper.EnsureLegalPath(pathTextsFolder, fullFileName);

            if (!File.Exists(fullFileName))
            {
                return null;
            }

            using (FileStream fileStream = new (fullFileName, FileMode.Open, FileAccess.Read))
            {
                JsonSerializerOptions options = new () { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                TextResource textResource = await System.Text.Json.JsonSerializer.DeserializeAsync<TextResource>(fileStream, options);
                textResource.Id = $"{org}-{app}-{language}";
                textResource.Org = org;
                textResource.Language = language;

                return textResource;
            }
        }

        /// <inheritdoc />
        public Application GetApplication()
        {
            // Cache application metadata
            if (_application != null)
            {
                return _application;
            }

            string filedata = string.Empty;
            string filename = _settings.AppBasePath + _settings.ConfigurationFolder + _settings.ApplicationMetadataFileName;
            try
            {
                if (File.Exists(filename))
                {
                    filedata = File.ReadAllText(filename, Encoding.UTF8);
                }

                _application = JsonConvert.DeserializeObject<Application>(filedata);
                return _application;
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when fetching application metadata. {0}", ex);
                return null;
            }
        }

        /// <inheritdoc/>
        public string GetModelMetaDataJSON(string org, string app)
        {
            Application applicationMetadata = GetApplication();

            string dataTypeId = string.Empty;
            foreach (DataType data in applicationMetadata.DataTypes)
            {
                if (data.AppLogic != null && !string.IsNullOrEmpty(data.AppLogic.ClassRef))
                {
                    dataTypeId = data.Id;
                }
            }

            string filename = _settings.AppBasePath + _settings.ModelsFolder + dataTypeId + "." + _settings.ServiceMetadataFileName;
            string filedata = File.ReadAllText(filename, Encoding.UTF8);

            return filedata;
        }

        /// <inheritdoc/>
        public string GetModelJsonSchema(string modelId)
        {
            string legalPath = $"{_settings.AppBasePath}{_settings.ModelsFolder}";
            string filename = $"{legalPath}{modelId}.{_settings.JsonSchemaFileName}";
            PathHelper.EnsureLegalPath(legalPath, filename);

            string filedata = File.ReadAllText(filename, Encoding.UTF8);

            return filedata;
        }

        /// <inheritdoc/>
        public byte[] GetRuntimeResource(string resource)
        {
            byte[] fileContent = null;
            string path;
            if (resource == _settings.RuntimeAppFileName)
            {
                path = Path.Combine(_hostingEnvironment.WebRootPath, "runtime", "js", "react", _settings.RuntimeAppFileName);
            }
            else if (resource == _settings.ServiceStylesConfigFileName)
            {
                return Encoding.UTF8.GetBytes(_settings.GetStylesConfig());
            }
            else
            {
                path = Path.Combine(_hostingEnvironment.WebRootPath, "runtime", "css", "react", _settings.RuntimeCssFileName);
            }

            if (File.Exists(path))
            {
                fileContent = File.ReadAllBytes(path);
            }

            return fileContent;
        }

        /// <inheritdoc />
        public string GetPrefillJson(string dataModelName = "ServiceModel")
        {
            string legalPath = _settings.AppBasePath + _settings.ModelsFolder;
            string filename = legalPath + dataModelName + ".prefill.json";
            PathHelper.EnsureLegalPath(legalPath, filename);

            string filedata = null;
            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <inheritdoc />
        public string GetLayoutSettingsString()
        {
            string filename = Path.Join(_settings.AppBasePath, _settings.UiFolder, _settings.FormLayoutSettingsFileName);
            string filedata = null;
            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <inheritdoc />
        public LayoutSettings GetLayoutSettings()
        {
            string filename = Path.Join(_settings.AppBasePath, _settings.UiFolder, _settings.FormLayoutSettingsFileName);
            string filedata = null;
            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            LayoutSettings layoutSettings = JsonConvert.DeserializeObject<LayoutSettings>(filedata);
            return layoutSettings;
        }

        /// <inheritdoc />
        public string GetClassRefForLogicDataType(string dataType)
        {
            Application application = GetApplication();
            string classRef = string.Empty;

            DataType element = application.DataTypes.SingleOrDefault(d => d.Id.Equals(dataType));

            if (element != null)
            {
                classRef = element.AppLogic.ClassRef;
            }

            return classRef;
        }

        /// <inheritdoc />
        public List<AppOption> GetOptions(string optionId)
        {
            string legalPath = _settings.AppBasePath + _settings.OptionsFolder;
            string filename = legalPath + optionId + ".json";
            PathHelper.EnsureLegalPath(legalPath, filename);

            try
            {
                if (File.Exists(filename))
                {
                    string fileData = File.ReadAllText(filename, Encoding.UTF8);
                    List<AppOption> options = JsonConvert.DeserializeObject<List<AppOption>>(fileData);
                    return options;
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when fetching application metadata. {0}", ex);
                return null;
            }
        }

        /// <inheritdoc />
        public string GetLayouts()
        {
          Dictionary<string, object> layouts = new Dictionary<string, object>();

          // Get FormLayout.json if it exists and return it (for backwards compatibility)
          string fileName = _settings.AppBasePath + _settings.UiFolder + "FormLayout.json";
          if (File.Exists(fileName))
          {
            string fileData = File.ReadAllText(fileName, Encoding.UTF8);
            layouts.Add("FormLayout", JsonConvert.DeserializeObject<object>(fileData));
            return JsonConvert.SerializeObject(layouts);
          }

          string layoutsPath = _settings.AppBasePath + _settings.UiFolder + "layouts/";
          if (Directory.Exists(layoutsPath))
          {
            foreach (string file in Directory.GetFiles(layoutsPath))
            {
              string data = File.ReadAllText(file, Encoding.UTF8);
              string name = file.Replace(layoutsPath, string.Empty).Replace(".json", string.Empty);
              layouts.Add(name, JsonConvert.DeserializeObject<object>(data));
            }
          }

          return JsonConvert.SerializeObject(layouts);
        }

        /// <inheritdoc />
        public string GetLayoutSets()
        {
            string filename = Path.Join(_settings.AppBasePath, _settings.UiFolder, _settings.LayoutSetsFileName);
            string filedata = null;
            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <inheritdoc />
        public string GetLayoutsForSet(string layoutSetId)
        {
            Dictionary<string, object> layouts = new Dictionary<string, object>();

            string layoutsPath = _settings.AppBasePath + _settings.UiFolder + layoutSetId + "/layouts/";
            if (Directory.Exists(layoutsPath))
            {
                foreach (string file in Directory.GetFiles(layoutsPath))
                {
                    string data = File.ReadAllText(file, Encoding.UTF8);
                    string name = file.Replace(layoutsPath, string.Empty).Replace(".json", string.Empty);
                    layouts.Add(name, JsonConvert.DeserializeObject<object>(data));
                }
            }

            return JsonConvert.SerializeObject(layouts);
        }

        /// <inheritdoc />
        public string GetLayoutSettingsStringForSet(string layoutSetId)
        {
            string filename = Path.Join(_settings.AppBasePath, _settings.UiFolder, layoutSetId, _settings.FormLayoutSettingsFileName);
            string filedata = null;
            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            return filedata;
        }

        /// <inheritdoc />
        public LayoutSettings GetLayoutSettingsForSet(string layoutSetId)
        {
            string filename = Path.Join(_settings.AppBasePath, _settings.UiFolder, layoutSetId, _settings.FormLayoutSettingsFileName);
            string filedata = null;
            if (File.Exists(filename))
            {
                filedata = File.ReadAllText(filename, Encoding.UTF8);
            }

            LayoutSettings layoutSettings = JsonConvert.DeserializeObject<LayoutSettings>(filedata);
            return layoutSettings;
        }

        /// <inheritdoc />
        public byte[] GetRuleConfigurationForSet(string id)
        {
            string legalPath = Path.Join(_settings.AppBasePath, _settings.UiFolder);
            string filename = Path.Join(legalPath, id, _settings.RuleConfigurationJSONFileName);

            PathHelper.EnsureLegalPath(legalPath, filename);

            return ReadFileByte(filename);
        }

        /// <inheritdoc />
        public byte[] GetRuleHandlerForSet(string id)
        {
            string legalPath = Path.Join(_settings.AppBasePath, _settings.UiFolder);
            string filename = Path.Join(legalPath, id, _settings.RuleHandlerFileName);

            PathHelper.EnsureLegalPath(legalPath, filename);

            return ReadFileByte(filename);
        }

        private byte[] ReadFileByte(string fileName)
        {
            byte[] filedata = null;
            if (File.Exists(fileName))
            {
                filedata = File.ReadAllBytes(fileName);
            }

            return filedata;
        }
       
        private byte[] ReadFileContentsFromLegalPath(string legalPath, string filePath)
        {
            var fullFileName = legalPath + filePath;
            if (!PathHelper.ValidateLegalFilePath(legalPath, fullFileName))
            {
                throw new ArgumentException("Invalid argument", nameof(filePath));
            }

            if (File.Exists(fullFileName))
            {
                return File.ReadAllBytes(fullFileName);
            }

            return null;
        }
    }
}
