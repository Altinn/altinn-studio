using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
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
                .WithReferenceAssemblies(ReferenceAssemblyKind.NetStandard20)
                .AddReferences(MetadataReference.CreateFromFile(typeof(Microsoft.AspNetCore.Mvc.ModelBinding.BindNeverAttribute).GetTypeInfo().Assembly.Location))
                .AddReferences(MetadataReference.CreateFromFile(typeof(Newtonsoft.Json.JsonPropertyAttribute).GetTypeInfo().Assembly.Location))
                .AddReferences(MetadataReference.CreateFromFile(typeof(System.Text.Json.JsonElement).GetTypeInfo().Assembly.Location))
                .AddReferences(MetadataReference.CreateFromFile(typeof(RangeAttribute).GetTypeInfo().Assembly.Location))
                .AddSyntaxTrees(syntaxTree);

            Assembly assembly;
            using (var ms = new MemoryStream())
            {
                EmitResult result = compilation.Emit(ms);

                var ignoredDiagnostics = new[]
                {
                    "CS8019", // CS8019: Unnecessary using directive.
                };
                var diagnostics = result.Diagnostics.Where(d => !ignoredDiagnostics.Contains(d.Descriptor.Id)).ToArray();
                if (diagnostics.Any())
                {
                    List<string> customErrorMessages = new();
                    foreach (Diagnostic diagnostic in diagnostics)
                    {
                        customErrorMessages.Add(diagnostic.Id + "" + diagnostic.GetMessage() + csharpCode[(diagnostic.Location.SourceSpan.Start - 10)..(diagnostic.Location.SourceSpan.End + 10)]);
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
