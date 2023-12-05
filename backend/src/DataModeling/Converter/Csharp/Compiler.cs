using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using Basic.Reference.Assemblies;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Emit;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.Studio.DataModeling.Converter.Csharp
{
    public static class Compiler
    {
        public static Assembly CompileToAssembly(string csharpCode)
        {
            var syntaxTree = SyntaxFactory.ParseSyntaxTree(SourceText.From(csharpCode));

            var compilation = CSharpCompilation.Create(Guid.NewGuid().ToString())
                .WithOptions(new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary))
                .WithReferenceAssemblies(ReferenceAssemblyKind.Net60)
                .AddReferences(MetadataReference.CreateFromFile(typeof(Microsoft.AspNetCore.Mvc.ModelBinding.BindNeverAttribute).GetTypeInfo().Assembly.Location))
                .AddReferences(MetadataReference.CreateFromFile(typeof(Newtonsoft.Json.JsonPropertyAttribute).GetTypeInfo().Assembly.Location))
                .AddSyntaxTrees(syntaxTree);

            Assembly assembly = null;
            using (var ms = new MemoryStream())
            {
                EmitResult result = compilation.Emit(ms);

                if (!result.Success)
                {
                    IEnumerable<Diagnostic> failures = result.Diagnostics.Where(diagnostic =>
                        diagnostic.IsWarningAsError ||
                        diagnostic.Severity == DiagnosticSeverity.Error);

                    var errors = new StringBuilder();
                    List<string> customErrorMessages = new ();
                    foreach (Diagnostic diagnostic in failures)
                    {
                        string errorMessage = $"{diagnostic.Id}: {diagnostic.GetMessage()}";
                        errors.AppendLine(errorMessage);
                        customErrorMessages.Add(errorMessage);
                    }

                    throw new CsharpCompilationException($"// Compiler // CompileToAssembly // Csharp compilation failed with errors: {errors}", customErrorMessages);
                }
                ms.Seek(0, SeekOrigin.Begin);
                assembly = Assembly.Load(ms.ToArray());
            }

            return assembly;
        }
    }
}
