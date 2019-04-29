using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Xml.Serialization;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service that handle functionality needed for executing a Altinn Core Service (Functional term)
    /// </summary>
    public class ExecutionStudioSI : IExecution
    {
        private const string SERVICE_IMPLEMENTATION = "AltinnCoreServiceImpl.{0}.{1}_{2}.ServiceImplementation";

        private readonly ServiceRepositorySettings _settings;
        private readonly IRepository _repository;
        private readonly Interfaces.ICompilation _compilation;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GeneralSettings _generalSettings;
        private readonly IHostingEnvironment _hostingEnvironment;

        /// <summary>
        /// Initializes a new instance of the <see cref="ExecutionStudioSI"/> class
        /// </summary>
        /// <param name="settings">The repository setting service needed (set in startup.cs)</param>
        /// <param name="repositoryService">The repository service needed (set in startup.cs)</param>
        /// <param name="compilationService">The service compilation service needed (set in startup.cs)</param>
        /// <param name="partManager">The part manager</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="generalSettings">the current general settings</param>
        /// <param name="hostingEnvironment">the hosting environment</param>
        public ExecutionStudioSI(
            IOptions<ServiceRepositorySettings> settings,
            IRepository repositoryService,
            Interfaces.ICompilation compilationService,
            ApplicationPartManager partManager,
            IHttpContextAccessor httpContextAccessor,
            IOptions<GeneralSettings> generalSettings,
            IHostingEnvironment hostingEnvironment)
        {
            _settings = settings.Value;
            _repository = repositoryService;
            _compilation = compilationService;
            _httpContextAccessor = httpContextAccessor;
            _generalSettings = generalSettings.Value;
            _hostingEnvironment = hostingEnvironment;
        }

        /// <inheritdoc/>
        public IServiceImplementation GetServiceImplementation(string org, string service, bool startServiceFlag)
        {
            string assemblyName = LoadServiceAssembly(org, service, startServiceFlag);
            string implementationTypeName = string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service) + ".ServiceImplementation," + assemblyName;

            return (IServiceImplementation)Activator.CreateInstance(Type.GetType(implementationTypeName));
        }

        /// <inheritdoc/>
        public ServiceContext GetServiceContext(string org, string service, bool startServiceFlag)
        {
            var context = new ServiceContext
            {
                ServiceModelType = GetServiceImplementation(org, service, false).GetServiceModelType(),
                ServiceText = _repository.GetServiceTexts(org, service),
                ServiceMetaData = _repository.GetServiceMetaData(org, service),
                CurrentCulture = CultureInfo.CurrentUICulture.Name,
                WorkFlow = _repository.GetWorkFlow(org, service),
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
        public string GetCodelist(string org, string service, string name)
        {
            string codeList = _repository.GetCodelist(org, service, name);
            if (string.IsNullOrEmpty(codeList))
            {
                // Try find the codelist at the service owner level
                codeList = _repository.GetCodelist(org, null, name);
            }

            return codeList;
        }

        /// <inheritdoc/>
        public byte[] GetServiceResource(string org, string service, string resource)
        {
            return _repository.GetServiceResource(org, service, resource);
        }

        private string LoadServiceAssembly(string org, string service, bool startServiceFlag)
        {
            var codeCompilationResult = _compilation.CreateServiceAssembly(org, service, startServiceFlag);
            if (!codeCompilationResult.Succeeded)
            {
                var errorMessages = codeCompilationResult?.CompilationInfo?.Where(e => e.Severity == "Error")
                                        .Select(e => e.Info)
                                        .Distinct()
                                        .ToList() ?? new List<string>();

                throw new System.Exception("Koden kompilerer ikke" + Environment.NewLine +
                                           string.Join(Environment.NewLine, errorMessages));
            }

            return codeCompilationResult.AssemblyName;
        }

        /// <inheritdoc/>
        public ServiceMetadata GetServiceMetaData(string org, string service)
        {
            return _repository.GetServiceMetaData(org, service);
        }

        /// <inheritdoc/>
        public void CheckAndUpdateWorkflowFile(string owner, string service, string developer)
        {
            string workflowFullFilePath = _settings.GetWorkflowPath(owner, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + _settings.WorkflowFileName;
            string templateWorkflowData = File.ReadAllText(_generalSettings.WorkflowTemplate, Encoding.UTF8);

            if (!File.Exists(workflowFullFilePath))
            {
                // Create the workflow folder
                Directory.CreateDirectory(_settings.GetWorkflowPath(owner, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));
                File.WriteAllText(workflowFullFilePath, templateWorkflowData, Encoding.UTF8);
            }
            else
            {
                if (ShouldUpdateFile(workflowFullFilePath, templateWorkflowData))
                {
                    // Overwrite existing file
                    File.WriteAllText(workflowFullFilePath, templateWorkflowData, Encoding.UTF8);
                }
            }
        }

        private bool ShouldUpdateFile(string fullPath, string workflowData)
        {
            string currentworkflowData = File.ReadAllText(fullPath, Encoding.UTF8);
            Definitions templateWorkflowModel = null;
            Definitions currentWorkflowModel = null;

            // Getting template version
            XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
            using (TextReader tr = new StringReader(workflowData))
            {
                templateWorkflowModel = (Definitions)serializer.Deserialize(tr);
            }

            // Getting current version
            using (TextReader tr = new StringReader(currentworkflowData))
            {
                currentWorkflowModel = (Definitions)serializer.Deserialize(tr);
            }

            if (templateWorkflowModel != null && currentWorkflowModel != null && templateWorkflowModel.Id != currentWorkflowModel.Id)
            {
                return true;
            }
            else
            {
                return false;
            }
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
