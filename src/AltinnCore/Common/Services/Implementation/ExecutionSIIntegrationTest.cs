using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Runtime.Loader;
using System.Text.RegularExpressions;

using AltinnCore.Common.Backend;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Helpers.Extensions;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.ServiceMetadata;

using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.CodeAnalysis;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// This is the implementation of the Service Execution Service that uses local service packages (zip files) to retrieve the
    /// content for a service. This to more simulate the production scenario where this information would be stored in a database.
    /// </summary>
    public class ExecutionSIIntegrationTest : IExecution
    {
        private readonly IServicePackageRepository _packageRepository;
        private readonly IRepository _repository;
        private readonly ServiceRepositorySettings _settings;
        private readonly CustomRoslynCompilationService _compilation;

        /// <summary>
        /// Initializes a new instance of the <see cref="ExecutionSIIntegrationTest"/> class
        /// </summary>
        /// <param name="roslynCompilationService">The compilation service needed (set in startup.cs)</param>
        /// <param name="repositorySettings">The repository setting service needed (set in startup.cs)</param>
        /// <param name="packageRepository">The service package repository</param>
        /// <param name="repository">The repository </param>
        public ExecutionSIIntegrationTest(
            IViewCompiler roslynCompilationService,
            IOptions<ServiceRepositorySettings> repositorySettings,
            IServicePackageRepository packageRepository,
            IRepository repository)
        {
            _packageRepository = packageRepository;
            _repository = repository;
            _settings = repositorySettings.Value;
            _compilation = (CustomRoslynCompilationService)roslynCompilationService;
        }

        /// <summary>
        /// Create a new instance ID
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The new instance ID</returns>
        public int GetNewServiceInstanceID(string org, string service)
        {
            int value = 1000;
            Random rnd = new Random();
            value += rnd.Next(1, 999);
            return value;
        }

        /// <summary>
        /// Creates the service context made available for the Altinn Core services and views.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The service context</returns>
        public ServiceContext GetServiceContext(string org, string service)
        {
            var activePackage = GetActivePackage(org, service);
            var context = new ServiceContext
                              {
                                  CurrentCulture = CultureInfo.CurrentUICulture.Name,
                              };

            using (var archive = _packageRepository.GetZipArchive(activePackage))
            {
                var serviceImplementation = GetServiceImplementation(org, service, activePackage, archive);
                context.ServiceModelType = serviceImplementation.GetServiceModelType();
                context.ServiceText = GetResourceCollections(archive).ToKeyToLanguageToValueDictionary();
                context.ServiceMetaData = GetServiceMetaData(archive);
                context.WorkFlow = GetWorkflow(archive);
            }

            if (context.ServiceMetaData?.Elements != null)
            {
                context.RootName = context.ServiceMetaData.Elements.Values.First(e => e.ParentElement == null).Name;
            }

            return context;
        }

        /// <summary>
        /// Returns the serviceImplementation for a given service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The service Implementation</returns>
        public IServiceImplementation GetServiceImplementation(string org, string service)
        {
            var activePackage = GetActivePackage(org, service);
            using (var archive = _packageRepository.GetZipArchive(activePackage))
            {
                return GetServiceImplementation(org, service, activePackage, archive);
            }
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
            return _repository.GetCodelist(org, service, name);
        }

        private IServiceImplementation GetServiceImplementation(string org, string service, ServicePackageDetails activePackage, ZipArchive zipArchive)
        {
            LoadServiceAssembly(org, service, activePackage, zipArchive);
            var implementationTypeName = string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service)
                                         + ".ServiceImplementation," + activePackage.AssemblyName;
            var type = Type.GetType(implementationTypeName);
            return (IServiceImplementation)Activator.CreateInstance(type);
        }

        private void LoadServiceAssembly(string org, string service, ServicePackageDetails servicePackageDetails, ZipArchive zipArchive)
        {
            var assemblykey = org + "_" + service;

            var assemblyName = servicePackageDetails.AssemblyName + ".dll";
            MemoryStream memoryStream = new MemoryStream();
            using (Stream input = zipArchive.Entries.First(e => e.Name == assemblyName).Open())
            {
                input.CopyTo(memoryStream);
            }

            memoryStream.Position = 0;
            AssemblyLoadContext.Default.LoadFromStream(memoryStream);

            if (_compilation.ServiceReferences.ContainsKey(assemblykey))
            {
                _compilation.ServiceReferences.Remove(assemblykey);
            }

            memoryStream.Seek(0, SeekOrigin.Begin);
            MetadataReference newReference = MetadataReference.CreateFromStream(memoryStream);
            _compilation.ServiceReferences.Add(assemblykey, newReference);
        }

        private ServicePackageDetails GetActivePackage(string org, string service)
        {
            var allPackages = _packageRepository.GetServicePackages(org, service);
            if (!allPackages.Any())
            {
                throw new Exception("Ingen pakker.");
            }

            return allPackages.OrderBy(s => s.CreatedDateTime).Last();
        }

        private ServiceMetadata GetServiceMetaData(ZipArchive zipArchive)
        {
            return zipArchive.DeserializeFirstFileNamed<ServiceMetadata>(_settings.ServiceMetadataFileName);
        }

        private List<WorkFlowStep> GetWorkflow(ZipArchive zipArchive)
        {
            return zipArchive.DeserializeFirstFileNamed<List<WorkFlowStep>>(_settings.WorkFlowFileName);
        }

        private IEnumerable<ResourceCollection> GetResourceCollections(ZipArchive zipArchive)
        {
            var regex = new Regex(@"Resources\\resource\..*\.json", RegexOptions.IgnoreCase);
            return zipArchive.Entries
                .Where(r => regex.IsMatch(r.FullName))
                .DeserializeAllAs<ResourceCollection>();
        }

        /// <inheritdoc/>
        public byte[] GetServiceResource(string org, string service, string resource)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public ServiceMetadata GetServiceMetaData(string org, string service)
        {
          throw new NotImplementedException();
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
