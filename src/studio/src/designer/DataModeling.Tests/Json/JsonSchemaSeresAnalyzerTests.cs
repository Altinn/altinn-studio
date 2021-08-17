using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Pointer;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json
{
    public class JsonSchemaSeresAnalyzerTests
    {
        public JsonSchemaSeresAnalyzerTests()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
        }

        [Theory]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema.json", "#/$defs/melding-modell")]
        public async Task IsValidComplexType_HasProperties_ShouldReturnTrue(string path, string jsonPointer)
        {
            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);
            var subSchema = QueryForSubSchema(schema, jsonPointer);

            Assert.True(new JsonSchemaSeresAnalyzer().IsValidComplexType(subSchema));
        }

        [Theory]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema.json", "#/oneOf/0")]
        public async Task IsValidComplexType_HasRefWithProperties_ShouldReturnTrue(string path, string jsonPointer)
        {
            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);
            var subSchema = QueryForSubSchema(schema, jsonPointer);

            Assert.True(new JsonSchemaSeresAnalyzer().IsValidComplexType(subSchema));
        }

        private JsonSchema QueryForSubSchema(JsonSchema jsonSchema, string jsonPointer)
        {
            var pointer = JsonPointer.Parse(jsonPointer);

            IRefResolvable schemaSegment = jsonSchema;
            foreach (var segment in pointer.Segments)
            {                
                schemaSegment = schemaSegment.ResolvePointerSegment(segment.Value);
                if (schemaSegment == null)
                {
                    return null;
                }
            }

            return schemaSegment as JsonSchema;
        }
    }
}
