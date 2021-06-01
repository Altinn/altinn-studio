using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Basic.Reference.Assemblies;
using Designer.Tests.Utils;
using Manatee.Json;
using Manatee.Json.Schema;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Emit;
using Microsoft.CodeAnalysis.Text;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonSchema2Metadata2CSharpTests
    {
        [Fact]
        public void JsonSerialize()
        {
        }

        [Fact]
        public async Task FlatSchema_ShouldSerializeToCSharp()
        {
            var org = "yabbin";
            var app = "datamodelling";
            var jsonSchemaString = @"{""properties"":{""melding"":{""properties"":{""test"":{""type"":""object"",""properties"":{""navn"":{""type"":""string""}}}},""type"":""object""}},""definitions"":{}}";
            var modelName = "test";

            JsonSchema jsonSchema = await ParseJsonSchema(jsonSchemaString);
            ModelMetadata modelMetadata = GenerateModelMetadata(org, app, jsonSchema);
            string classes = GenerateCSharpClasses(modelMetadata);

            Assert.NotEmpty(classes);

            var syntaxTree = SyntaxFactory.ParseSyntaxTree(SourceText.From(classes));
            var assemblyPath = Path.ChangeExtension(Path.GetTempFileName(), "exe");

            var compilation = CSharpCompilation.Create(Path.GetFileName(assemblyPath))
                .WithOptions(new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary))
                .WithReferenceAssemblies(ReferenceAssemblyKind.Net50)
                .AddReferences(MetadataReference.CreateFromFile(typeof(Microsoft.AspNetCore.Mvc.ModelBinding.BindNeverAttribute).GetTypeInfo().Assembly.Location))
                .AddReferences(MetadataReference.CreateFromFile(typeof(Newtonsoft.Json.JsonPropertyAttribute).GetTypeInfo().Assembly.Location))
                .AddSyntaxTrees(syntaxTree);

            // Compile the generated C# class
            Assembly assembly = null;
            using (var ms = new MemoryStream())
            {
                EmitResult result = compilation.Emit(ms);

                Assert.True(result.Success);

                if (!result.Success)
                {
                    IEnumerable<Diagnostic> failures = result.Diagnostics.Where(diagnostic =>
                        diagnostic.IsWarningAsError ||
                        diagnostic.Severity == DiagnosticSeverity.Error);

                    foreach (Diagnostic diagnostic in failures)
                    {
                        //Console.Error.WriteLine("{0}: {1}", diagnostic.Id, diagnostic.GetMessage());
                    }
                }
                else
                {
                    ms.Seek(0, SeekOrigin.Begin);
                    assembly = Assembly.Load(ms.ToArray());
                }
            }

            Assert.NotNull(assembly);

            // Check that we can serialize JSON into the newly generated class
            Type type = assembly.GetType("Altinn.App.Models.melding");
            object obj = Activator.CreateInstance(type);

            object melding = JsonSerializer.Deserialize(@"{""test"":{""navn"":""Ronny""}}", type);

        }

        [Fact]
        public void SeresSchema_ShouldSerializeToCSharp()
        {
            var org = "yabbin";
            var app = "hvem-er-hvem";
                        
            JsonSchema jsonSchema = TestDataHelper.LoadTestDataAsJsonSchema("Designer.Tests._TestData.Model.JsonSchema.hvem-er-hvem.json");
            ModelMetadata modelMetadata = GenerateModelMetadata(org, app, jsonSchema);
            string classes = GenerateCSharpClasses(modelMetadata);

            Assert.NotEmpty(classes);

            // TODO: Add asserts that verifies that the generated C# class is actually valid according to the JSON Schema provided
        }

        private static async Task<JsonSchema> ParseJsonSchema(string jsonSchemaString)
        {
            TextReader textReader = new StringReader(jsonSchemaString);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);
            return jsonSchema;
        }

        private static ModelMetadata GenerateModelMetadata(string org, string app, JsonSchema jsonSchema)
        {
            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(org, app, jsonSchema);
            ModelMetadata modelMetadata = converter.GetModelMetadata();

            string root = modelMetadata.Elements != null && modelMetadata.Elements.Count > 0 ? modelMetadata.Elements.Values.First(e => e.ParentElement == null).TypeName : null;
            string model = converter.GetInstanceModel().ToString();

            return modelMetadata;
        }

        private static string GenerateCSharpClasses(ModelMetadata modelMetadata)
        {
            JsonMetadataParser modelGenerator = new JsonMetadataParser();
            string classes = modelGenerator.CreateModelFromMetadata(modelMetadata);
            return classes;
        }
    }
}
