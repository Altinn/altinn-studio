using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.AspNetCore.Mvc.Razor.Internal;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.Extensions.FileProviders;

namespace AltinnCore.Common.Backend
{
    /// <summary>
    /// This is the custom Roslyn compilation Service created for supporting
    /// using dynamic models from database in RazorViews
    /// <see href="https://github.com/aspnet/Mvc/issues/4938"/>
    /// </summary>
    public class CustomRoslynCompilationService : IViewCompiler
    {
        /*private readonly DebugInformationFormat _pdbFormat =
#if NET451
            SymbolsUtility.SupportsFullPdbGeneration() ?
                DebugInformationFormat.Pdb :
                DebugInformationFormat.PortablePdb;
#else
            DebugInformationFormat.PortablePdb;
#endif*/
        private readonly ApplicationPartManager _partManager = null;
        /*private readonly IFileProvider _fileProvider;
        private readonly Action<RoslynCompilationContext> _compilationCallback;
        private readonly CSharpParseOptions _parseOptions;
        private readonly CSharpCompilationOptions _compilationOptions;*/
        private readonly IList<MetadataReference> _additionalMetadataReferences = null;
        /*private readonly RazorTemplateEngine _templateEngine;
        private readonly CSharpCompiler _csharpCompiler;
        private readonly ILogger _logger;
        private readonly IList<CompiledViewDescriptor> _precompiledViews;*/
        /*public CustomRoslynCompilationService(
            IFileProvider fileProvider,
            RazorTemplateEngine templateEngine,
            CSharpCompiler csharpCompiler,
            Action<RoslynCompilationContext> compilationCallback,
            IList<CompiledViewDescriptor> precompiledViews,
            ILogger logger)
        {
            _fileProvider = fileProvider;
            _templateEngine = templateEngine;
            _csharpCompiler = csharpCompiler;
            _compilationCallback = compilationCallback;
            _precompiledViews = precompiledViews;
            _logger = logger;
        }*/

        /// <summary>
        /// Gets or sets The ServiceReferences
        /// </summary>
        public Dictionary<string, MetadataReference> ServiceReferences { get; protected set; } = new Dictionary<string, MetadataReference>();

        private IList<MetadataReference> CompilationReferences
        {
            get
            {
                return GetCompilationReferences();
            }
        }

        /// <inheritdoc/>
        public Task<CompiledViewDescriptor> CompileAsync(string relativePath)
        {
            throw new NotImplementedException();
        }

        /*public CompilationResult Compile(RelativeFileInfo fileInfo, string compilationContent)
        {
            if (fileInfo == null)
            {
                throw new ArgumentNullException(nameof(fileInfo));
            }

            if (compilationContent == null)
            {
                throw new ArgumentNullException(nameof(compilationContent));
            }

            var assemblyName = Path.GetRandomFileName();

            var sourceText = SourceText.From(compilationContent, Encoding.UTF8);
            var syntaxTree = CSharpSyntaxTree.ParseText(
                sourceText,
                path: assemblyName,
                options: _parseOptions);

            var compilation = CSharpCompilation.Create(
                assemblyName,
                options: _compilationOptions,
                syntaxTrees: new[] { syntaxTree },
                references: CompilationReferences);

            compilation = Rewrite(compilation);

            var compilationContext = new RoslynCompilationContext(compilation);
            _compilationCallback(compilationContext);
            compilation = compilationContext.Compilation;

            using (var assemblyStream = new MemoryStream())
            {
                using (var pdbStream = new MemoryStream())
                {
                    var result = compilation.Emit(
                        assemblyStream,
                        pdbStream,
                        options: new EmitOptions(debugInformationFormat: _pdbFormat));

                    if (!result.Success)
                    {
                        if (!compilation.References.Any() && !CompilationReferences.Any())
                        {
                            throw new Exception("TODO: Fail!");
                        }

                        return GetCompilationFailedResult(
                            fileInfo.RelativePath,
                            compilationContent,
                            assemblyName,
                            result.Diagnostics);
                    }

                    assemblyStream.Seek(0, SeekOrigin.Begin);
                    pdbStream.Seek(0, SeekOrigin.Begin);

                    var assembly = LoadStream(assemblyStream, pdbStream);
                    var type = assembly.GetExportedTypes().FirstOrDefault(a => !a.IsNested);

                    return new CompilationResult(type);
                }
            }
        }

        /// <summary>
        /// Internal for unit testing
        /// </summary>
        /// <param name="relativePath">The relative path</param>
        /// <param name="compilationContent">The compilation content</param>
        /// <param name="assemblyName">The assemblyName</param>
        /// <param name="diagnostics">The diagnostics</param>
        /// <returns>The compilation result</returns>
        internal CompilationResult GetCompilationFailedResult(
            string relativePath,
            string compilationContent,
            string assemblyName,
            IEnumerable<Diagnostic> diagnostics)
        {
            var diagnosticGroups = diagnostics
                .Where(IsError)
                .GroupBy(diagnostic => GetFilePath(relativePath, diagnostic), StringComparer.Ordinal);

            var failures = new List<CompilationFailure>();
            foreach (var group in diagnosticGroups)
            {
                var sourceFilePath = group.Key;
                string sourceFileContent;
                if (string.Equals(assemblyName, sourceFilePath, StringComparison.Ordinal))
                {
                    // The error is in the generated code and does not have a mapping line pragma
                    sourceFileContent = compilationContent;
                }
                else
                {
                    sourceFileContent = ReadFileContentsSafely(_fileProvider, sourceFilePath);
                }

                var compilationFailure = new CompilationFailure(
                    sourceFilePath,
                    sourceFileContent,
                    compilationContent,
                    group.Select(GetDiagnosticMessage));

                failures.Add(compilationFailure);
            }

            return new CompilationResult(failures);
        }
        */

        /// <summary>
        /// Gets the sequence of <see cref="MetadataReference"/> instances used for compilation.
        /// </summary>
        /// <returns>The <see cref="MetadataReference"/> instances.</returns>
        protected virtual IList<MetadataReference> GetCompilationReferences()
        {
            var applicationReferences = new MetadataReference[]
{
                MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(System.Runtime.AssemblyTargetedPatchBandAttribute).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(Microsoft.CSharp.RuntimeBinder.CSharpArgumentInfo).Assembly.Location),
};

            if (_additionalMetadataReferences.Count == 0 && ServiceReferences.Count == 0)
            {
                return applicationReferences;
            }

            var compilationReferences = new List<MetadataReference>(applicationReferences.Count() + _additionalMetadataReferences.Count + ServiceReferences.Count);
            compilationReferences.AddRange(applicationReferences);
            compilationReferences.AddRange(_additionalMetadataReferences);
            compilationReferences.AddRange(ServiceReferences.Values);

            return compilationReferences;
        }

        private static string GetFilePath(string relativePath, Diagnostic diagnostic)
        {
            if (diagnostic.Location == Location.None)
            {
                return relativePath;
            }

            return diagnostic.Location.GetMappedLineSpan().Path;
        }

        private static bool IsError(Diagnostic diagnostic)
        {
            return diagnostic.IsWarningAsError || diagnostic.Severity == DiagnosticSeverity.Error;
        }

        private static string ReadFileContentsSafely(IFileProvider fileProvider, string filePath)
        {
            var fileInfo = fileProvider.GetFileInfo(filePath);
            if (fileInfo.Exists)
            {
                try
                {
                    using (var reader = new StreamReader(fileInfo.CreateReadStream()))
                    {
                        return reader.ReadToEnd();
                    }
                }
                catch
                {
                    // Ignore any failures
                }
            }

            return null;
        }

        private static DiagnosticMessage GetDiagnosticMessage(Diagnostic diagnostic)
        {
            var mappedLineSpan = diagnostic.Location.GetMappedLineSpan();
            return new DiagnosticMessage(
                diagnostic.GetMessage(),
                CSharpDiagnosticFormatter.Instance.Format(diagnostic),
                mappedLineSpan.Path,
                mappedLineSpan.StartLinePosition.Line + 1,
                mappedLineSpan.StartLinePosition.Character + 1,
                mappedLineSpan.EndLinePosition.Line + 1,
                mappedLineSpan.EndLinePosition.Character + 1);
        }

        private Assembly LoadStream(MemoryStream assemblyStream, MemoryStream pdbStream)
        {
#if NET451
            return Assembly.Load(assemblyStream.ToArray(), pdbStream.ToArray());
#else
            return System.Runtime.Loader.AssemblyLoadContext.Default.LoadFromStream(assemblyStream, pdbStream);
#endif
        }
    }
}
