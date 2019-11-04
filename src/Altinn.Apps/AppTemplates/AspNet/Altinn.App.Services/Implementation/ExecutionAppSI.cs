using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Text;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// App implementation of the execution service needed for executing an Altinn Core Application (Functional term).
    /// </summary>
    public class ExecutionAppSI : IExecution
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IRepository _repository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IHostingEnvironment _hostingEnvironment;

        private Dictionary<string, string> _assemblyNames = new Dictionary<string, string>();

        /// <summary>
        /// Initializes a new instance of the <see cref="ExecutionAppSI"/> class.
        /// </summary>
        /// <param name="settings">The app repository settings.</param>
        /// <param name="repositoryService">The repository service needed</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="hostingEnvironment">The hosting environment</param>
        public ExecutionAppSI(
            IOptions<ServiceRepositorySettings> settings,
            IRepository repositoryService,
            IHttpContextAccessor httpContextAccessor,
            IHostingEnvironment hostingEnvironment)
        {
            _settings = settings.Value;
            _repository = repositoryService;
            _httpContextAccessor = httpContextAccessor;
            _hostingEnvironment = hostingEnvironment;
        }

        /// <inheritdoc/>
        public Guid GetNewServiceInstanceID()
        {
            return Guid.NewGuid();
        }

        /// <inheritdoc/>
        public string GetCodelist(string org, string app, string name)
        {
            // Not relevant in an app scenario.
            return null;
        }

        /// <inheritdoc/>
        public byte[] GetServiceResource(string org, string app, string resource)
        {
            byte[] fileContent = null;

            if (resource == _settings.RuleHandlerFileName)
            {
                if (File.Exists(_settings.GetDynamicsPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + resource))
                {
                    fileContent = File.ReadAllBytes( _settings.GetDynamicsPath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + resource);
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

        /// <inheritdoc/>
        public ServiceMetadata.ServiceMetadata GetServiceMetaData(string org, string app)
        {
            string filename = _settings.BaseResourceFolderContainer + _settings.GetMetadataFolder() + _settings.ServiceMetadataFileName;
            string filedata = File.ReadAllText(filename, Encoding.UTF8);
            return JsonConvert.DeserializeObject<ServiceMetadata.ServiceMetadata>(filedata);
        }

        /// <inheritdoc/>
        public byte[] GetRuntimeResource(string resource)
        {
            byte[] fileContent = null;
            string path = string.Empty;
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
    }
}
