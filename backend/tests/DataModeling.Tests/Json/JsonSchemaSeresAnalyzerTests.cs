using System;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using FluentAssertions;
using Json.Pointer;
using Json.Schema;
using SharedResources.Tests;
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
        [InlineData(@"Model/JsonSchema/Seres/SeresBasicSchema.json", "#/$defs/melding-modell", "Schema has properties")]
        [InlineData(@"Model/JsonSchema/Seres/SeresBasicSchema.json", "#/oneOf/[0]", "Schema has $ref keyword which in turn has properties")]
        [InlineData(@"Model/JsonSchema/General/ComplexContentExtension.json", "#", "Schema has allOf keyword which in turn has a decendant with properties.")]
        [InlineData(@"Model/JsonSchema/General/ComplexSchema.json", "#", "Nested $ref. Schema has a $ref keyword which points to a type which also has a $ref keyword which in turn points to a type which has properties.")]
        public void IsValidComplexType_ComplexType_ShouldReturnTrue(string path, string jsonPointer, string testCase)
        {
            _testOutputHelper.WriteLine($"{testCase}");

            var schema = SharedResourcesHelper.LoadJsonSchemaTestData(path);

            var normalizer = new JsonSchemaNormalizer();
            var normalizedSchema = normalizer.Normalize(schema);
            var json = JsonSerializer.Serialize(normalizedSchema, new JsonSerializerOptions { WriteIndented = true });

            var analyzer = new SeresJsonSchemaAnalyzer();

            var results = analyzer.AnalyzeSchema(schema);

            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().Contain(CompatibleXsdType.ComplexType);
        }

        [Theory]
        [InlineData(@"Model/JsonSchema/General/ComplexContentExtension.json", "#", "Schema has allOf keyword which has at least two sub-schemas - one with a $ref keyword and another with a properties keyword extending the $ref base type.")]
        public void IsValidComplexContentExtension_ComplexContentExtention_ShouldReturnTrue(string path, string jsonPointer, string testCase)
        {
            _testOutputHelper.WriteLine($"{testCase}");

            var schema = SharedResourcesHelper.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var normalizer = new JsonSchemaNormalizer();
            var normalizedSchema = normalizer.Normalize(schema);
            var json = JsonSerializer.Serialize(normalizedSchema, new JsonSerializerOptions { WriteIndented = true });

            var results = analyzer.AnalyzeSchema(schema);

            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().Contain(CompatibleXsdType.ComplexContent);
            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().Contain(CompatibleXsdType.ComplexContentExtension);
            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().NotContain(CompatibleXsdType.SimpleContentExtension);
            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().NotContain(CompatibleXsdType.SimpleContentRestriction);
        }

        [Theory]
        [InlineData(@"Model/JsonSchema/General/ComplexContentExtension_negative.json", "#/properties/Root/allOf/[0]", "Schema has allOf keyword with multiple sub schemas, but they don't fullfill the requirement of one being a $ref and one being a properties (which in turn is a valid ComplexType)")]
        public void IsValidComplexContentExtension_NotComplexContentExtention_ShouldReturnFalse(string path, string jsonPointer, string testCase)
        {
            _testOutputHelper.WriteLine($"{testCase}");

            var schema = SharedResourcesHelper.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var results = analyzer.AnalyzeSchema(schema);

            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().NotContain(CompatibleXsdType.ComplexContent);
            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().NotContain(CompatibleXsdType.ComplexContentExtension);
        }

        [Theory]
        [InlineData(@"Model/JsonSchema/Seres/SeresWithAttributes.json", "#/$defs/melding-modell/allOf/[0]/properties/a1", "Schema has complex type with attributes. Property a1 is an attribute.")]
        [InlineData(@"Model/JsonSchema/Seres/SeresWithAttributes.json", "#/$defs/melding-modell/allOf/[0]/properties/a2", "Schema has complex type with attributes. Property a2 is an attribute.")]
        [InlineData(@"Model/JsonSchema/Seres/SeresWithAttributes.json", "#/$defs/melding-modell/allOf/[0]/properties/a3", "Schema has complex type with attributes. Property a3 is an attribute.")]
        [InlineData(@"Model/JsonSchema/Seres/SeresWithAttributes.json", "#/$defs/melding-modell/allOf/[0]/properties/a4", "Schema has complex type with attributes. Property a4 is an attribute.")]
        public void IsValidAttribute_Attribute_ShouldReturnTrue(string path, string jsonPointer, string testCase)
        {
            _testOutputHelper.WriteLine($"{testCase}");

            var schema = SharedResourcesHelper.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var results = analyzer.AnalyzeSchema(schema);

            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().Contain(CompatibleXsdType.SimpleType);
            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().Contain(CompatibleXsdType.Attribute);
        }

        [Theory]
        [InlineData(@"Model/JsonSchema/General/NillableAttribute.json", "#/$defs/main/properties/refered", "Schema (refered) has a oneOf with one refered type and one null schema.")]
        [InlineData(@"Model/JsonSchema/General/NillableAttribute.json", "#/$defs/main/properties/nilstring", "Schema (nillstring) has a multiple Json value types allowed, including null.")]
        public void IsValidNillableAttribute_NillableAttribute_ShouldReturnTrue(string path, string jsonPointer, string testCase)
        {
            _testOutputHelper.WriteLine($"{testCase}");

            var schema = SharedResourcesHelper.LoadJsonSchemaTestData(path);
            var analyzer = new SeresJsonSchemaAnalyzer();

            var results = analyzer.AnalyzeSchema(schema);

            results.GetCompatibleTypes(JsonPointer.Parse(jsonPointer)).Should().Contain(CompatibleXsdType.Nillable);
        }
    }
}
