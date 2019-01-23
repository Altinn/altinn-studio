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
using AltinnCore.ServiceLibrary.ServiceMetadata;
using AltinnCore.ServiceLibrary.Workflow;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service that handle functionality needed for executing a Altinn Core Service (Functional term)
    /// </summary>
    public class ExecutionSILocalDev : IExecution
    {
        private const string SERVICE_IMPLEMENTATION = "AltinnCoreServiceImpl.{0}.{1}_{2}.ServiceImplementation";

        private readonly ServiceRepositorySettings _settings;
        private readonly IRepository _repository;
        private readonly Interfaces.ICompilation _compilation;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="ExecutionSILocalDev"/> class
        /// </summary>
        /// <param name="settings">The repository setting service needed (set in startup.cs)</param>
        /// <param name="repositoryService">The repository service needed (set in startup.cs)</param>
        /// <param name="compilationService">The service compilation service needed (set in startup.cs)</param>
        /// <param name="partManager">The part manager</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="generalSettings">the current general settings</param>
        public ExecutionSILocalDev(
            IOptions<ServiceRepositorySettings> settings,
            IRepository repositoryService,
            Interfaces.ICompilation compilationService,
            ApplicationPartManager partManager,
            IHttpContextAccessor httpContextAccessor,
            IOptions<GeneralSettings> generalSettings)
        {
            _settings = settings.Value;
            _repository = repositoryService;
            _compilation = compilationService;
            _httpContextAccessor = httpContextAccessor;
            _generalSettings = generalSettings.Value;
        }

        /// <summary>
        /// Returns the serviceImplementation for a given service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The service Implementation</returns>
        public IServiceImplementation GetServiceImplementation(string org, string service)
        {
            string assemblyName = LoadServiceAssembly(org, service);
            string implementationTypeName = string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service) + ".ServiceImplementation," + assemblyName;

            return (IServiceImplementation)Activator.CreateInstance(Type.GetType(implementationTypeName));
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

            ////if (metaData.CodeListUsages != null)
            ////{
            ////    foreach (CodeListUsage codeListUsage in metaData.CodeListUsages)
            ////    {
            ////        // Todo Handle codeList from other sources
            ////        codeLists.Add(codeListUsage.Name, GetCodeListByName(org, service, codeListUsage.Name));
            ////    }
            ////}

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
            string textData = File.ReadAllText(_settings.GetCodelistPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)) + name + ".json");
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
        /// Gets the raw content of a code list
        /// </summary>
        /// <param name="org">The organization code of the service owner</param>
        /// <param name="service">The service code of the current service</param>
        /// <param name="name">The name of the code list to retrieve</param>
        /// <returns>Raw contents of a code list file</returns>
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

        private string LoadServiceAssembly(string org, string service)
        {
            var codeCompilationResult = _compilation.CreateServiceAssembly(org, service);
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
        /// <returns>The service metadata for a service</returns>
        public ServiceMetadata GetServiceMetaData(string org, string service)
        {
            return _repository.GetServiceMetaData(org, service);
        }

        /// <summary>
        /// Method that receives a stream and saves it to the given path
        /// </summary>
        /// <param name="path">The path to the file to be saved to</param>
        /// <param name="streamToSave">The steam to save to the file</param>
        public void SaveToFile(string path, Stream streamToSave)
        {
            using (Stream stream = File.Open(path, FileMode.Create, FileAccess.ReadWrite))
            {
                streamToSave.CopyTo(stream);
            }
        }

        /// <summary>
        /// Method that fetches the users repo, zips it and returns the zip file
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <returns>The zipped file</returns>
        public FileStream ZipAndReturnFile(string org, string service, string developer)
        {
            CheckAndUpdateWorkflowFile(org, service, developer);
            string startPath = _settings.GetServicePath(org, service, developer);
            string zipPath = $"{_settings.GetOrgPath(org, developer)}{service}.zip";
            if (File.Exists(zipPath))
            {
                File.Delete(zipPath);
            }

            ZipFile.CreateFromDirectory(startPath, zipPath);
            return File.Open(zipPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        }

        /// <summary>
        /// Method that fetches the file of the specified path
        /// </summary>
        /// <param name="path">The path of the file to open</param>
        /// <returns>The filestream for the given paths file</returns>
        public FileStream GetFileStream(string path)
        {
            return File.Open(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        }

        /// <summary>
        /// Method that adds the workflow file to the repository if its not there, or replaces it if its an old version of the workflow file
        /// </summary>
        /// <param name="owner">The owner of the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The developer of the service</param>
        private void CheckAndUpdateWorkflowFile(string owner, string service, string developer)
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
    }
}
