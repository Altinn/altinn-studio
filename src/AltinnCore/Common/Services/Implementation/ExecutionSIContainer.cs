using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using AltinnCore.Common.Backend;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    using System.Reflection;
    using System.Runtime.Loader;
    using System.Text;
    using AltinnCore.Common.Helpers;
    using AltinnCore.Common.Helpers.Extensions;
    using Microsoft.AspNetCore.Http;

    /// <summary>
    /// Service that handle functionality needed for executing a Altinn Core Service (Functional term)
    /// </summary>
    public class ExecutionSIContainer : IExecution
    {
        private const string SERVICE_IMPLEMENTATION = "AltinnCoreServiceImpl.{0}.{1}_{2}.ServiceImplementation";

        private readonly ServiceRepositorySettings _settings;
        private readonly IRepository _repository;
        private readonly IHttpContextAccessor _httpContextAccessor;

        private Dictionary<string, string> _assemblyNames = new Dictionary<string, string>();

        /// <summary>
        /// Initializes a new instance of the <see cref="ExecutionSIContainer"/> class
        /// </summary>
        /// <param name="settings">The repository setting service needed (set in startup.cs)</param>
        /// <param name="repositoryService">The repository service needed (set in startup.cs)</param>
        /// <param name="compilationService">The service compilation service needed (set in startup.cs)</param>
        /// <param name="partManager">The part manager</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        public ExecutionSIContainer(
            IOptions<ServiceRepositorySettings> settings,
            IRepository repositoryService,
            ApplicationPartManager partManager,
            IHttpContextAccessor httpContextAccessor)
        {
            _settings = settings.Value;
            _repository = repositoryService;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Returns the serviceImplementation for a given service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The service Implementation</returns>
        public IServiceImplementation GetServiceImplementation(string org, string service)
        {
            string assemblykey = org + "_" + service;
            string implementationTypeName = null;
            Type type = null;

            if (_assemblyNames.ContainsKey(assemblykey))
            {
                implementationTypeName = string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service) + ".ServiceImplementation," + _assemblyNames[assemblykey];

                type = Type.GetType(implementationTypeName);

                if (type != null)
                {
                    return (IServiceImplementation)Activator.CreateInstance(Type.GetType(implementationTypeName));
                }
            }

            implementationTypeName = string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service) + ".ServiceImplementation";

            Assembly asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(_settings.BaseResourceFolderContainer + _settings.GetBinaryFolder() + "AltinnService.dll");

            type = asm.GetType(implementationTypeName);

            if (type != null)
            {
                _assemblyNames.Add(assemblykey, asm.FullName);
            }

            dynamic serviceImplementation = Activator.CreateInstance(type);
            return (IServiceImplementation)serviceImplementation;
        }

        /// <summary>
        /// Creates the service context made available for the Altinn Core services and views.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The service context</returns>
        public ServiceContext GetServiceContext(string org, string service)
        {
            var context = new ServiceContext
            {
                ServiceModelType = GetServiceImplementation(org, service).GetServiceModelType(),
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

        /// <summary>
        /// Generates a new service instanceID for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A new instanceId</returns>
        public int GetNewServiceInstanceID(string org, string service)
        {
            int value = 1000;
            Random rnd = new Random();
            value += rnd.Next(1, 999);
            return value;
        }

        /// <summary>
        /// Returns the list of code list for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>List of code lists</returns>
        public Dictionary<string, CodeList> GetCodelists(string org, string service)
        {
            Dictionary<string, CodeList> codeLists = new Dictionary<string, CodeList>();

            ServiceMetadata metaData = _repository.GetServiceMetaData(org, service);

            return codeLists;
        }

        /// <summary>
        /// Return a given code list
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name of the code list</param>
        /// <returns>The code list</returns>
        public CodeList GetCodeListByName(string org, string service, string name)
        {
            CodeList codeList = null;
            string textData = File.ReadAllText(_settings.BaseResourceFolderContainer + _settings.GetCodeListFolder() + name + ".json");
            codeList = JsonConvert.DeserializeObject<CodeList>(textData);

            return codeList;
        }

        /// <summary>
        /// Returns the basic service owner configuration
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <returns>The basic service owner configuration</returns>
        public OrgConfiguration GetServiceOwnerConfiguration(string org)
        {
            OrgConfiguration config;
            string textData = File.ReadAllText(_settings.BaseResourceFolderContainer + org + "/" + org + "/config.json");
            config = JsonConvert.DeserializeObject<OrgConfiguration>(textData);
            return config;
        }

        /// <summary>
        /// Returns the basic service configuration
        /// </summary>
        /// <param name="org">The organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The basic service configuration</returns>
        public ServiceConfiguration GetServiceConfiguration(string org, string service)
        {
            ServiceConfiguration config;
            string textData = null;
            textData = File.ReadAllText(_settings.BaseResourceFolderContainer + "config.json");

            config = JsonConvert.DeserializeObject<ServiceConfiguration>(textData);
            return config;
        }

        /// <summary>
        /// Gets the raw content of a code list
        /// </summary>
        /// <param name="org">The organization code of the service owner</param>
        /// <param name="service">The service code of the current service</param
        /// <param name="name">The name of the code list to retrieve</param>
        /// <returns>Raw contents of a code list file</returns>
        public string GetCodelist(string org, string service, string name)
        {
            // Not relevant in a container scenario.
            return null;
        }

        /// <inheritdoc/>
        public byte[] GetServiceResource(string org, string service, string resource)
        {
            byte[] fileContent = null;

            if (File.Exists(_settings.BaseResourceFolderContainer + _settings.GetResourceFolder() + resource))
            {
                fileContent = File.ReadAllBytes(_settings.BaseResourceFolderContainer + _settings.GetResourceFolder() + resource);
            }

            return fileContent;
        }

        /// <summary>
        /// Returns the service metadata for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The service metadata for a service</returns>
        public ServiceMetadata GetServiceMetaData(string org, string service)
        {
            string filename = _settings.BaseResourceFolderContainer + _settings.GetMetadataFolder() + _settings.ServiceMetadataFileName;
            string filedata = File.ReadAllText(filename, Encoding.UTF8);
            return JsonConvert.DeserializeObject<ServiceMetadata>(filedata);
        }

        /// <summary>
        /// Get workflow for the service
        /// </summary>
        /// <param name="org">the organisation</param>
        /// <param name="service">the service</param>
        /// <param name="edition">the service edition</param>
        /// <returns>The workflow for the service</returns>
        public List<WorkFlowStep> GetWorkFlow(string org, string service, string edition)
        {
            string filename = _settings.BaseResourceFolderContainer + _settings.GetMetadataFolder() + _settings.WorkFlowFileName;
            string textData = File.ReadAllText(filename, Encoding.UTF8);
            return JsonConvert.DeserializeObject<List<WorkFlowStep>>(textData);
        }

        /// <inheritdoc/>
        public void SaveToFile(string path, Stream streamToSave)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public FileStream ZipAndReturnFile(string org, string service, string developer)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public FileStream GetFileStream(string path)
        {
            throw new NotImplementedException();
        }
    }
}
