using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    using System.Reflection;
    using System.Runtime.Loader;
    using System.Text;
    using AltinnCore.Common.Helpers;
    using AltinnCore.ServiceLibrary.Models;
    using AltinnCore.ServiceLibrary.Models.Workflow;
    using AltinnCore.ServiceLibrary.Services.Interfaces;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.AspNetCore.Http;
    using Microsoft.Extensions.Logging;

    /// <summary>
    /// Service that handle functionality needed for executing a Altinn Core Service (Functional term)
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
        /// <param name="settings">The repository setting service needed (set in startup.cs)</param>
        /// <param name="repositoryService">The repository service needed (set in startup.cs)</param>
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
        public IServiceImplementation GetServiceImplementation(string applicationOwnerId, string applicationId, bool startServiceFlag)
        {
            string assemblykey = $"{applicationOwnerId}_{applicationId}";
            string implementationTypeName = null;
            Type type = null;

            if (_assemblyNames.ContainsKey(assemblykey))
            {
                implementationTypeName = string.Format(CodeGeneration.ServiceNamespaceTemplate, applicationOwnerId, applicationId) + ".ServiceImplementation," + _assemblyNames[assemblykey];

                type = Type.GetType(implementationTypeName);

                if (type != null)
                {
                    return (IServiceImplementation)Activator.CreateInstance(Type.GetType(implementationTypeName));
                }
            }

            implementationTypeName = string.Format(CodeGeneration.ServiceNamespaceTemplate, applicationOwnerId, applicationId) + ".ServiceImplementation";

            Assembly asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(_settings.BaseResourceFolderContainer + _settings.GetBinaryFolder() + "AltinnService.dll");

            type = asm.GetType(implementationTypeName);

            if (type != null)
            {
                _assemblyNames.Add(assemblykey, asm.FullName);
            }

            dynamic serviceImplementation = Activator.CreateInstance(type);
            return (IServiceImplementation)serviceImplementation;
        }

        /// <inheritdoc/>
        public ServiceContext GetServiceContext(string applicationOwnerId, string applicationId, bool startServiceFlag)
        {
            var context = new ServiceContext
            {
                ServiceModelType = GetServiceImplementation(applicationOwnerId, applicationId, startServiceFlag).GetServiceModelType(),
                ServiceMetaData = _repository.GetServiceMetaData(applicationOwnerId, applicationId),
                CurrentCulture = CultureInfo.CurrentUICulture.Name,
                WorkFlow = _repository.GetWorkFlow(applicationOwnerId, applicationId),
            };

            if (context.ServiceMetaData != null && context.ServiceMetaData.Elements != null)
            {
                context.RootName = context.ServiceMetaData.Elements.Values.First(e => e.ParentElement == null).Name;
            }

            return context;
        }

        /// <inheritdoc/>
        public Guid GetNewServiceInstanceID()
        {
            return Guid.NewGuid();
        }

        /// <inheritdoc/>
        public string GetCodelist(string applicationOwnerId, string applicationId, string name)
        {
            // Not relevant in a app scenario.
            return null;
        }

        /// <inheritdoc/>
        public byte[] GetServiceResource(string applicationOwnerId, string applicationId, string resource)
        {
            byte[] fileContent = null;

            if (resource == _settings.RuleHandlerFileName)
            {
                if (File.Exists(_settings.BaseResourceFolderContainer + _settings.GetDynamicsPath(applicationOwnerId, applicationId, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + resource))
                {
                    fileContent = File.ReadAllBytes(_settings.BaseResourceFolderContainer + _settings.GetDynamicsPath(applicationOwnerId, applicationId, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + resource);
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
        public ServiceMetadata GetServiceMetaData(string applicationOwnerId, string applicationId)
        {
            string filename = _settings.BaseResourceFolderContainer + _settings.GetMetadataFolder() + _settings.ServiceMetadataFileName;
            string filedata = File.ReadAllText(filename, Encoding.UTF8);
            return JsonConvert.DeserializeObject<ServiceMetadata>(filedata);
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
