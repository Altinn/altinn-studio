using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
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
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IHostingEnvironment _hostingEnvironment;
        private readonly ILogger _logger;

        private Dictionary<string, string> _assemblyNames = new Dictionary<string, string>();

        /// <summary>
        /// Initializes a new instance of the <see cref="AppResourcesSI"/> class.
        /// </summary>
        /// <param name="settings">The app repository settings.</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="hostingEnvironment">The hosting environment</param>
        public AppResourcesSI(
            IOptions<AppSettings> settings,
            IHttpContextAccessor httpContextAccessor,
            IHostingEnvironment hostingEnvironment,
            ILogger<AppResourcesSI> logger)
        {
            _settings = settings.Value;
            _httpContextAccessor = httpContextAccessor;
            _hostingEnvironment = hostingEnvironment;
            _logger = logger;
        }

        /// <inheritdoc/>
        public byte[] GetAppResource(string org, string app, string resource)
        {
            byte[] fileContent = null;

            if (resource == _settings.RuleHandlerFileName)
            {
                if (File.Exists(_settings.AppBasePath + _settings.UiFolder + resource))
                {
                    fileContent = File.ReadAllBytes(_settings.AppBasePath + _settings.UiFolder + resource);
                }
            }
            else if (resource == _settings.FormLayoutJSONFileName)
            {
                if (File.Exists(_settings.AppBasePath + _settings.UiFolder + resource))
                {
                    fileContent = File.ReadAllBytes(_settings.AppBasePath + _settings.UiFolder + resource);
                }
            }
            else if (resource == _settings.RuleConfigurationJSONFileName)
            {
                if (File.Exists(_settings.AppBasePath + _settings.UiFolder + resource))
                {
                    fileContent = File.ReadAllBytes(_settings.AppBasePath + _settings.UiFolder + resource);
                }
            }
            else
            {
                if (File.Exists(_settings.BaseResourceFolderContainer + _settings.GetResourceFolder() + resource))
                {
                    fileContent = File.ReadAllBytes(_settings.BaseResourceFolderContainer + _settings.GetResourceFolder() + resource);
                }
            }

            return fileContent;
        }

        public byte[] GetText(string org, string app, string textResource)
        {
            byte[] fileContent = null;

            if (File.Exists(_settings.AppBasePath + _settings.ConfigurationFolder + _settings.TextFolder + textResource))
            {
                fileContent = File.ReadAllBytes(_settings.AppBasePath + _settings.ConfigurationFolder + _settings.TextFolder + textResource);
            }

            return fileContent;
        }

        public Application GetApplication()
        {
            string filedata = string.Empty;
            string filename = _settings.AppBasePath + _settings.ConfigurationFolder + _settings.ApplicationMetadataFileName;
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


        /// <inheritdoc/>
        public ServiceMetadata.ServiceMetadata GetServiceMetaData(string org, string app)
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
            return JsonConvert.DeserializeObject<ServiceMetadata.ServiceMetadata>(filedata);
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

        public string GetClassRefForLogicDataType(string dataType)
        {
            Application application = GetApplication();
            string classRef = string.Empty;

            DataType element = application.DataTypes.Single(d => d.Id.Equals(dataType));

            if (element != null)
            {
                classRef = element.AppLogic.ClassRef;
            }
            else
            {
                foreach (DataType dataTypeElement in application.DataTypes)
                {
                    if (dataTypeElement.AppLogic != null)
                    {
                        classRef = dataTypeElement.AppLogic.ClassRef;
                    }
                }
            }

            return classRef;
        }
    }
}
