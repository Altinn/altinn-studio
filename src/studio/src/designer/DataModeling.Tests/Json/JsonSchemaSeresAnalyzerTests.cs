using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json;
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
        [InlineData(@"Model\JsonSchema\ComplexContentExtension.json", "#", "Schema has allOf keyword which in turn has a decendant with properties.")]
        [InlineData(@"Model\JsonSchema\ComplexSchema.json", "#", "Nested $ref. Schema has a $ref keyword which points to a type which also has a $ref keyword which in turn points to a type which has properties.")]
        public async Task IsValidComplexType_ComplexType_ShouldReturnTrue(string path, string jsonPointer, string testCase)
        {
            _testOutputHelper.WriteLine($"{testCase}");

            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);

            var normalizer = new JsonSchemaNormalizer();
            var normalizedSchema = normalizer.Normalize(schema);
            var json = JsonSerializer.Serialize(normalizedSchema, new JsonSerializerOptions { WriteIndented = true });

            var analyzer = new JsonSchemaSeresAnalyzer();

            var results = analyzer.AnalyzeSchema(schema);

            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().Equal(CompatibleXsdType.ComplexType);
        }

        [Theory]
        [InlineData(@"Model\JsonSchema\ComplexContentExtension.json", "#/allOf/[0]", "Schema has allOf keyword which has at least two sub-schemas - one with a $ref keyword and another with a properties keyword extending the $ref base type.")]
        public async Task IsValidComplexContentExtension_ComplexContentExtention_ShouldReturnTrue(string path, string jsonPointer, string testCase)
        {
            _testOutputHelper.WriteLine($"{testCase}");

            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);
            var analyzer = new JsonSchemaSeresAnalyzer();

            var normalizer = new JsonSchemaNormalizer();
            var normalizedSchema = normalizer.Normalize(schema);
            var json = JsonSerializer.Serialize(normalizedSchema, new JsonSerializerOptions { WriteIndented = true });

            var results = analyzer.AnalyzeSchema(schema);

            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().Contain(CompatibleXsdType.ComplexContent);
            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().Contain(CompatibleXsdType.ComplexContentExtension);
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
