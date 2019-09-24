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
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Studio implementation of the execution service needed for executing an Altinn Core Application (Functional term).
    /// </summary>
    public class ExecutionStudioSI : IExecution
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IRepository _repository;
        private readonly Interfaces.ICompilation _compilation;
        private readonly IHostingEnvironment _hostingEnvironment;

        /// <summary>
        /// Initializes a new instance of the <see cref="ExecutionStudioSI"/> class
        /// </summary>
        /// <param name="settings">The app repository settings.</param>
        /// <param name="repositoryService">The repository service needed</param>
        /// <param name="compilationService">The compilation service needed</param>
        /// <param name="partManager">The part manager</param>
        /// <param name="hostingEnvironment">the hosting environment</param>
        public ExecutionStudioSI(
            IOptions<ServiceRepositorySettings> settings,
            IRepository repositoryService,
            Interfaces.ICompilation compilationService,
            ApplicationPartManager partManager,
            IHostingEnvironment hostingEnvironment)
        {
            _settings = settings.Value;
            _repository = repositoryService;
            _compilation = compilationService;
            _hostingEnvironment = hostingEnvironment;
        }

        /// <inheritdoc/>
        public IServiceImplementation GetServiceImplementation(string org, string app, bool startAppFlag)
        {
            string assemblyName = LoadServiceAssembly(org, app, startAppFlag);
            string implementationTypeName = string.Format(CodeGeneration.ServiceNamespaceTemplate, org, CompileHelper.GetCSharpValidAppId(app)) + ".ServiceImplementation," + assemblyName;

            return (IServiceImplementation)Activator.CreateInstance(Type.GetType(implementationTypeName));
        }

        /// <inheritdoc/>
        public ServiceContext GetServiceContext(string org, string app, bool startAppFlag)
        {
            var context = new ServiceContext
            {
                ServiceModelType = GetServiceImplementation(org, app, false).GetServiceModelType(),
                ServiceText = _repository.GetServiceTexts(org, app),
                ServiceMetaData = _repository.GetServiceMetaData(org, app),
                CurrentCulture = CultureInfo.CurrentUICulture.Name,
                WorkFlow = _repository.GetWorkFlow(org, app),
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
        public string GetCodelist(string org, string app, string name)
        {
            string codeList = _repository.GetCodelist(org, app, name);
            if (string.IsNullOrEmpty(codeList))
            {
                // Try find the codelist at the service owner level
                codeList = _repository.GetCodelist(org, null, name);
            }

            return codeList;
        }

        /// <inheritdoc/>
        public byte[] GetServiceResource(string org, string app, string resource)
        {
            return _repository.GetServiceResource(org, app, resource);
        }

        private string LoadServiceAssembly(string org, string app, bool startAppFlag)
        {
            var codeCompilationResult = _compilation.CreateServiceAssembly(org, app, startAppFlag);
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
        public ServiceMetadata GetServiceMetaData(string org, string app)
        {
            return _repository.GetServiceMetaData(org, app);
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
