using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Text;
using AltinnCore.Common.Backend;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Emit;
using Microsoft.CodeAnalysis.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service responsible for compiling the code for a service. This included the service implementation and the service
    /// model classes
    /// </summary>
    public class CompilationSI : Interfaces.ICompilation
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly ApplicationPartManager _partManager;
        private readonly CustomRoslynCompilationService _roslynCompilation;
        private readonly IRepository _repository;
        private readonly ILogger<CompilationSI> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        private Dictionary<string, CodeCompilationResult> _assemblyNames = new Dictionary<string, CodeCompilationResult>();

        /// <summary>
        /// Initializes a new instance of the <see cref="CompilationSI"/> class.
        /// </summary>
        /// <param name="configuration">The configuration</param>
        /// <param name="partManager">The part manager</param>
        /// <param name="compilationService">The compilation service</param>
        /// <param name="repositoryService">The service repository service</param>
        /// <param name="logger">The logger</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        public CompilationSI(
            IOptions<ServiceRepositorySettings> configuration,
            ApplicationPartManager partManager,
            IViewCompiler compilationService,
            IRepository repositoryService,
            ILogger<CompilationSI> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _repository = repositoryService;
            _settings = configuration.Value;
            _partManager = partManager;
            _roslynCompilation = (CustomRoslynCompilationService)compilationService;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Creates a zip-file containing all files necessary for executing a service
        /// </summary>
        /// <param name="org">The organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Was the package creation successful</returns>
        public bool CreateServicePackage(string org, string service)
        {
            ServiceMetadata serviceMetadata = _repository.GetServiceMetaData(org, service);

            string packagesDir = _settings.GetServicePackagesPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            string tempDir = _settings.GetTemporaryPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            string tempDirName = Path.GetRandomFileName();
            string tempDirPath = tempDir + tempDirName + "/";

            CopyDirectoryContents(_settings.GetMetadataPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)), tempDirPath + ServiceRepositorySettings.METADATA_FOLDER_NAME);
            CopyDirectoryContents(_settings.GetCodelistPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)), tempDirPath + ServiceRepositorySettings.CODELISTS_FOLDER_NAME);
            CopyDirectoryContents(_settings.GetResourcePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)), tempDirPath + ServiceRepositorySettings.RESOURCE_FOLDER_NAME);

            Directory.CreateDirectory(tempDirPath + "/Assemblies/");
            Directory.CreateDirectory(packagesDir);

            string compileResult = string.Empty;
            string assemblyName = CreateServiceAssembly(org, service, tempDirPath + "/Assemblies/").AssemblyName;

            ServicePackageDetails details = new ServicePackageDetails
            {
                AssemblyName = assemblyName,
                Organization = org,
                Service = service,
                CreatedDateTime = DateTime.Now,
            };

            string detailsAsJson = JsonConvert.SerializeObject(details);
            string filePath = tempDirPath + "/ServicePackageDetails.json";
            File.WriteAllText(filePath, detailsAsJson, Encoding.UTF8);

            ZipFile.CreateFromDirectory(tempDirPath, packagesDir + tempDirName + ".zip");

            Directory.Delete(tempDirPath, true);

            return true;
        }

        /// <summary>
        /// Creates the service assembly for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="outputLocation">The directory where the resulting assembly should be saved</param>
        /// <param name="loadAssemblyContext">Defines if assembly should be loaded in context</param>
        /// <returns>The assembly name</returns>
        public CodeCompilationResult CreateServiceAssembly(string org, string service, string outputLocation = null, bool loadAssemblyContext = true)
        {
            CodeCompilationResult compilationResult = new CodeCompilationResult() { CompileStarted = DateTime.Now };
            string assemblykey = org + "_" + service;

            List<AltinnCoreFile> implementationFiles = _repository.GetImplementationFiles(org, service);

            DateTime lastChanged = new DateTime(2000, 01, 01);
            foreach (AltinnCoreFile file in implementationFiles)
            {
                if (file.LastChanged > lastChanged)
                {
                    lastChanged = file.LastChanged;
                }
            }

            if (_assemblyNames.ContainsKey(assemblykey) && _assemblyNames[assemblykey].CompileStarted > lastChanged && string.IsNullOrWhiteSpace(outputLocation))
            {
                compilationResult = _assemblyNames[assemblykey];
                return compilationResult;
            }

            SyntaxTree[] syntaxTrees = GetSyntaxTrees(org, service);
            List<MetadataReference> references = new List<MetadataReference>();
            Assembly root = Assembly.GetEntryAssembly();

            string assemblyName = Path.GetRandomFileName();

            MetadataReferenceFeature referenceFeature = new MetadataReferenceFeature();
            _partManager.PopulateFeature(referenceFeature);

            CSharpCompilation compilation = CSharpCompilation.Create(
                assemblyName,
                syntaxTrees: syntaxTrees,
                references: referenceFeature.MetadataReferences,
                options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));

            using (var pdbMs = new MemoryStream())
            using (var ms = new MemoryStream())
            {
                EmitResult result;
                Stopwatch stopWatch = new Stopwatch();
                stopWatch.Start();
                if (!string.IsNullOrEmpty(outputLocation))
                {
                    result = compilation.Emit(outputLocation + assemblyName + ".dll", outputLocation + assemblyName + ".pdb");
                }
                else
                {
                    result = compilation.Emit(ms, pdbMs);
                }

                stopWatch.Stop();
                compilationResult.TimeUsed = stopWatch.Elapsed;

                compilationResult.CompilationInfo = new List<CompilationInfo>();
                foreach (Diagnostic diag in result.Diagnostics)
                {
                    // TODO: Decide how to handle this special CS1701 we get
                    if (!diag.Id.Equals("CS1701"))
                    {
                        var compInfo = new CompilationInfo
                        {
                            Info = diag.GetMessage(),
                            FilePath = diag.Location.SourceTree.FilePath,
                            FileName = System.IO.Path.GetFileName(diag.Location.SourceTree.FilePath),
                            Severity = diag.Severity.ToString(),
                            Code = diag.Id,
                            WarningLevel = diag.WarningLevel,
                            LineNumber = diag.Location.GetLineSpan().StartLinePosition.Line + 1,
                        };

                        if (diag.Severity.Equals(DiagnosticSeverity.Warning))
                        {
                            compilationResult.Warnings++;
                        }
                        else if (diag.Severity.Equals(DiagnosticSeverity.Error))
                        {
                            compilationResult.Errors++;
                        }

                        compilationResult.CompilationInfo.Add(compInfo);
                    }
                }

                if (!result.Success)
                {
                    LogEmitResult(result);
                }
                else
                {
                    compilationResult.AssemblyName = compilation.AssemblyName;
                    compilationResult.Succeeded = true;

                    if (string.IsNullOrEmpty(outputLocation) && loadAssemblyContext)
                    {
                        ms.Seek(0, SeekOrigin.Begin);
                        pdbMs.Seek(0, SeekOrigin.Begin);
                        AssemblyLoadContext.Default.LoadFromStream(ms, pdbMs);
                        ms.Seek(0, SeekOrigin.Begin);
                        MetadataReference newReference = MetadataReference.CreateFromStream(ms);
                        if (_roslynCompilation.ServiceReferences.ContainsKey(assemblykey))
                        {
                            _roslynCompilation.ServiceReferences.Remove(assemblykey);
                        }

                        _roslynCompilation.ServiceReferences.Add(assemblykey, newReference);

                        if (_assemblyNames.ContainsKey(assemblykey))
                        {
                            _assemblyNames.Remove(assemblykey);
                        }

                        _assemblyNames.Add(assemblykey, compilationResult);
                    }

                    return compilationResult;
                }
            }

            return compilationResult;
        }

        private void LogEmitResult(EmitResult result)
        {
            IEnumerable<Diagnostic> failures = result.Diagnostics.Where(diagnostic =>
                          diagnostic.IsWarningAsError ||
                          diagnostic.Severity == DiagnosticSeverity.Error);

            foreach (Diagnostic diagnostic in failures)
            {
                _logger.LogError("{0}: {1}", diagnostic.Id, diagnostic.GetMessage());
                Console.Error.WriteLine("{0}: {1}", diagnostic.Id, diagnostic.GetMessage());
            }
        }

        private void CopyDirectoryContents(string sourceDirectory, string targetDirectory)
        {
            Directory.CreateDirectory(targetDirectory);

            if (!Directory.Exists(sourceDirectory))
            {
                return;
            }

            foreach (string fileName in Directory.EnumerateFiles(sourceDirectory))
            {
                File.Copy(fileName, fileName.Replace(sourceDirectory, targetDirectory));
            }
        }

        /// <summary>
        /// Read all source documents for a given service and put it in a syntax tree array.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The syntax tree</returns>
        private SyntaxTree[] GetSyntaxTrees(string org, string service)
        {
            List<SyntaxTree> syntaxTrees = new List<SyntaxTree>();
            string dir = _settings.GetServicePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            var ext = new List<string> { ".cs" };
            var codeFiles = Directory.GetFiles(dir, "*.*", SearchOption.AllDirectories)
                 .Where(s => ext.Any(e => s.EndsWith(e)));

            foreach (string filePath in codeFiles)
            {
                using (var stream = File.OpenRead(filePath))
                {
                    SourceText text = SourceText.From(stream, Encoding.UTF8);
                    SyntaxTree tree = CSharpSyntaxTree.ParseText(text, null, filePath);
                    syntaxTrees.Add(tree);
                }
            }

            return syntaxTrees.ToArray();
        }
    }
}
