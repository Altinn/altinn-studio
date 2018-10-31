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
    using AltinnCore.Common.Helpers;
    using AltinnCore.Common.Helpers.Extensions;
    using Microsoft.AspNetCore.Http;

    /// <summary>
    /// Service that handle functionality needed for executing a Altinn Core Service (Functional term)
    /// </summary>
    public class ExecutionSILocalDev : IExecution
    {
        private const string SERVICE_IMPLEMENTATION = "AltinnCoreServiceImpl.{0}.{1}_{2}.ServiceImplementation";

        private readonly ServiceRepositorySettings _settings;
        private readonly IRepository _repository;
        private readonly Interfaces.ICompilation _compilation;
        private readonly IViewRepository _viewRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="ExecutionSILocalDev"/> class 
        /// </summary>
        /// <param name="settings">The repository setting service needed (set in startup.cs)</param>
        /// <param name="repositoryService">The repository service needed (set in startup.cs)</param>
        /// <param name="compilationService">The service compilation service needed (set in startup.cs)</param>
        /// <param name="partManager">The part manager</param>
        /// <param name="viewRepository">The view Repository</param>
        public ExecutionSILocalDev(
            IOptions<ServiceRepositorySettings> settings,
            IRepository repositoryService,
            Interfaces.ICompilation compilationService,
            ApplicationPartManager partManager,
            IViewRepository viewRepository, IHttpContextAccessor httpContextAccessor)
        {
            _settings = settings.Value;
            _repository = repositoryService;
            _compilation = compilationService;
            _viewRepository = viewRepository;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Returns the serviceImplementation for a given service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The service Implementation</returns>
        public IServiceImplementation GetServiceImplementation(string org, string service, string edition)
        {
            string assemblyName = LoadServiceAssembly(org, service, edition);
            string implementationTypeName = string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service, edition) + ".ServiceImplementation," + assemblyName;

            return (IServiceImplementation)Activator.CreateInstance(Type.GetType(implementationTypeName));
        }

        /// <summary>
        /// Creates the service context made available for the Altinn Core services and views.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The service context</returns>
        public ServiceContext GetServiceContext(string org, string service, string edition)
        {
            var context = new ServiceContext
            {
                ServiceModelType = GetServiceImplementation(org, service, edition).GetServiceModelType(),
                ServiceText = _repository.GetServiceTexts(org, service, edition),
                ServiceMetaData = _repository.GetServiceMetaData(org, service, edition),
                ViewMetadata = _viewRepository.GetViews(org, service, edition),
                CurrentCulture = CultureInfo.CurrentUICulture.Name,
                WorkFlow = _repository.GetWorkFlow(org, service, edition)
            };

            if (context.ServiceMetaData != null && context.ServiceMetaData.Elements != null)
            {
                context.RootName = context.ServiceMetaData.Elements.Values.First(e => e.ParentElement == null).Name;
            }

            return context;
        }

        /// <summary>
        /// Returns the RazorView for a given viewId and serviceId
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="viewName">The view name</param>
        /// <returns>The name of the RazorView</returns>
        public string GetRazorView(string org, string service, string edition, string viewName)
        {
            var views = _viewRepository.GetViews(org, service, edition);
            var result = views.GetDefaultRazerViewName(viewName);
            return result;
        }

        /// <summary>
        /// Generates a new service instanceID for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>A new instanceId</returns>
        public int GetNewServiceInstanceID(string org, string service, string edition)
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
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>List of code lists</returns>
        public Dictionary<string, CodeList> GetCodelists(string org, string service, string edition)
        {
            Dictionary<string, CodeList> codeLists = new Dictionary<string, CodeList>();

            ServiceMetadata metaData = _repository.GetServiceMetaData(org, service, edition);

            ////if (metaData.CodeListUsages != null)
            ////{
            ////    foreach (CodeListUsage codeListUsage in metaData.CodeListUsages)
            ////    {
            ////        // Todo Handle codeList from other sources
            ////        codeLists.Add(codeListUsage.Name, GetCodeListByName(org, service, edition, codeListUsage.Name));
            ////    }
            ////}

            return codeLists;
        }

        /// <summary>
        /// Return a given code list
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="name">The name of the code list</param>
        /// <returns>The code list</returns>
        public CodeList GetCodeListByName(string org, string service, string edition, string name)
        {
            CodeList codeList = null;
            string textData = File.ReadAllText(_settings.GetCodelistPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + name + ".json");
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
            string textData = null;
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                textData = File.ReadAllText(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + org + "/" + org + "/config.json");
            }
            else
            {
                textData = File.ReadAllText(_settings.RepositoryLocation + org + "/" + org + "/config.json");
            }

            config = JsonConvert.DeserializeObject<OrgConfiguration>(textData);
            return config;
        }

        /// <summary>
        /// Returns the basic service configuration
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The basic service configuration</returns>
        public ServiceConfiguration GetServiceConfiguration(string org, string service)
        {
            ServiceConfiguration config;
            string textData = null;
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                textData = File.ReadAllText(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + org + "/" + service + "/config.json");
            }
            else
            {
                textData = File.ReadAllText(_settings.RepositoryLocation + org + "/" + service + "/config.json");
            }

            config = JsonConvert.DeserializeObject<ServiceConfiguration>(textData);
            return config;
        }

        /// <summary>
        /// Returns the basic service edition configuration
        /// </summary>
        /// <param name="org">The organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The basic service edition configuration</returns>
        public EditionConfiguration GetEditionConfiguration(string org, string service, string edition)
        {
            EditionConfiguration config;
            string textData = null;
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                textData = File.ReadAllText(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + org + "/" + service + "/" + edition + "/config.json");
            }
            else
            {
                textData = File.ReadAllText(_settings.RepositoryLocation + org + "/" + service + "/" + edition + "/config.json");
            }

            config = JsonConvert.DeserializeObject<EditionConfiguration>(textData);
            return config;
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
            string codeList = _repository.GetCodelist(org, service, edition, name);
            if (string.IsNullOrEmpty(codeList))
            {
                // Try find the codelist at the service owner level
                codeList = _repository.GetCodelist(org, null, null, name);
            }

            return codeList;
        }

        public byte[] GetServiceResource(string org, string service, string edition, string resource)
        {
            return _repository.GetServiceResource(org, service, edition, resource);
        }

        private string LoadServiceAssembly(string org, string service, string edition)
        {
            var codeCompilationResult = _compilation.CreateServiceAssembly(org, service, edition);
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


        /// <summary>
        /// Returns the service metadata for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The service metadata for a service</returns>
        public ServiceMetadata GetServiceMetaData(string org, string service, string edition)
        {
            return _repository.GetServiceMetaData(org, service, edition);
        }
    }
}
