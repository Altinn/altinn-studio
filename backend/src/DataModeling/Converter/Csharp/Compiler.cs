using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Basic.Reference.Assemblies;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Emit;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.Studio.DataModeling.Converter.Csharp
{
    public static class Compiler
    {
        /// <summary>
        /// Try to compile csharp class from generated csharp code as string
        /// </summary>
        /// <param name="csharpCode">Csharp code as string</param>
        /// <remarks>Throws a custom compiler exception with corresponding diagnostics if compilation fails</remarks>
        /// <returns>The corresponding assembly</returns>
        public static Assembly CompileToAssembly(string csharpCode)
        {
            var syntaxTree = SyntaxFactory.ParseSyntaxTree(SourceText.From(csharpCode));

            var compilation = CSharpCompilation.Create(Guid.NewGuid().ToString())
                .WithOptions(new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary))
                .WithReferenceAssemblies(ReferenceAssemblyKind.Net60)
                .AddReferences(MetadataReference.CreateFromFile(typeof(Microsoft.AspNetCore.Mvc.ModelBinding.BindNeverAttribute).GetTypeInfo().Assembly.Location))
                .AddReferences(MetadataReference.CreateFromFile(typeof(Newtonsoft.Json.JsonPropertyAttribute).GetTypeInfo().Assembly.Location))
                .AddSyntaxTrees(syntaxTree);

            Assembly assembly;
            using (var ms = new MemoryStream())
            {
                EmitResult result = compilation.Emit(ms);

                if (!result.Success)
                {
                    IEnumerable<Diagnostic> failures = result.Diagnostics.Where(diagnostic =>
                        diagnostic.IsWarningAsError ||
                        diagnostic.Severity == DiagnosticSeverity.Error);

                    List<string> customErrorMessages = new();
                    foreach (Diagnostic diagnostic in failures)
                    {
                        customErrorMessages.Add(diagnostic.GetMessage());
                    }

                    throw new CsharpCompilationException("Csharp compilation failed.", customErrorMessages);
                }
                ms.Seek(0, SeekOrigin.Begin);
                assembly = Assembly.Load(ms.ToArray());
            }

            return assembly;
        }
    }
}
