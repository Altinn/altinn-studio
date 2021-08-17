using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json.Keywords;
using FluentAssertions;
using Json.Pointer;
using Json.Schema;
using Xunit;
using Xunit.Abstractions;

namespace DataModeling.Tests.Json
{
    public class JsonSchemaSeresAnalyzerTests
    {
        private readonly ITestOutputHelper _testOutputHelper;

        public JsonSchemaSeresAnalyzerTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
            JsonSchemaKeywords.RegisterXsdKeywords();
        }

        [Theory]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema.json", "#/$defs/melding-modell", "Schema has properties")]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema.json", "#/oneOf/[0]", "Schema has $ref keyword which in turn has properties")]
        public async Task IsValidComplexType_ComplexType_ShouldReturnTrue(string path, string jsonPointer, string testCase)
        {
            _testOutputHelper.WriteLine($"{testCase}");

            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);
            var analyzer = new JsonSchemaSeresAnalyzer();

            var results = analyzer.AnalyzeSchema(schema);

            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().Equal(CompatibleXsdType.ComplexType);
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
