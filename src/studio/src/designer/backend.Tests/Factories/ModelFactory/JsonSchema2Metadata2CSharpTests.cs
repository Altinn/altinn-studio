using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Utils;
using Manatee.Json;
using Manatee.Json.Schema;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonSchema2Metadata2CSharpTests
    {
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

            // TODO: Add asserts that verifies that the generated C# class is actually valid according to the JSON Schema provided
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
