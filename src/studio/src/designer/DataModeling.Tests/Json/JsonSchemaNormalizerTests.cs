using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json
{
    public class JsonSchemaNormalizerTests
    {
        [Theory]
        [InlineData(@"Model\JsonSchema\General\AltinnAnnotation.json")]
        [InlineData(@"Model\JsonSchema\General\Any.json")]
        [InlineData(@"Model\JsonSchema\General\Attributes.json")]
        [InlineData(@"Model\JsonSchema\General\BuiltinTypes.json")]
        [InlineData(@"Model\JsonSchema\General\ComplexContentExtension.json")]
        [InlineData(@"Model\JsonSchema\General\ComplexContentRestriction.json")]
        [InlineData(@"Model\JsonSchema\General\ComplexSchema.json")]
        [InlineData(@"Model\JsonSchema\General\Definitions.json")]
        [InlineData(@"Model\JsonSchema\General\ElementAnnotation.json")]
        [InlineData(@"Model\JsonSchema\General\InterleavedNestedSequences.json")]
        [InlineData(@"Model\JsonSchema\General\NestedArrays.json")]
        [InlineData(@"Model\JsonSchema\General\NestedChoice.json")]
        [InlineData(@"Model\JsonSchema\General\NestedSequence.json")]
        [InlineData(@"Model\JsonSchema\General\NestedSequences.json")]
        [InlineData(@"Model\JsonSchema\General\NestedWithArrayChoice.json")]
        [InlineData(@"Model\JsonSchema\General\NestedWithArraySequence.json")]
        [InlineData(@"Model\JsonSchema\General\NestedWithOptionalChoice.json")]
        [InlineData(@"Model\JsonSchema\General\NestedWithOptionalSequence.json")]
        [InlineData(@"Model\JsonSchema\General\SimpleAll.json")]
        [InlineData(@"Model\JsonSchema\General\SimpleChoice.json")]
        [InlineData(@"Model\JsonSchema\General\SimpleContentExtension.json")]
        [InlineData(@"Model\JsonSchema\General\SimpleContentRestriction.json")]
        [InlineData(@"Model\JsonSchema\General\SimpleSequence.json")]
        [InlineData(@"Model\JsonSchema\General\SimpleTypeList.json")]
        [InlineData(@"Model\JsonSchema\General\SimpleTypeRestrictions.json")]
        public async Task Normalize_NoNormalization_ShouldEqualSourceSchema(string jsonSchemaTestdata)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var jsonSchema = await ResourceHelpers.LoadJsonSchemaTestData(jsonSchemaTestdata);
            var jsonSchemaText = JsonSerializer.Serialize(jsonSchema, new JsonSerializerOptions() { Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement) });

            var jsonSchemaNormalizer = new JsonSchemaNormalizer() { PerformNormalization = false };

            var normalizedJsonSchema = jsonSchemaNormalizer.Normalize(jsonSchema);
            var normalizedJsonSchemaText = JsonSerializer.Serialize(normalizedJsonSchema, new JsonSerializerOptions() { Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement) });

            normalizedJsonSchemaText.Should().BeEquivalentTo(jsonSchemaText);            
        }

        [Theory]
        [InlineData(@"Model\JsonSchema\General\normalize-root.json", @"Model\JsonSchema\General\normalize-root-expected.json")]
        [InlineData(@"Model\JsonSchema\General\normalize-root-ref.json", @"Model\JsonSchema\General\normalize-root-ref.json")]
        [InlineData(@"Model\JsonSchema\General\normalize-content.json", @"Model\JsonSchema\General\normalize-content-expected.json")]
        [InlineData(@"Model\JsonSchema\General\normalize-content-ref.json", @"Model\JsonSchema\General\normalize-content-ref-expected.json")]
        [InlineData(@"Model\JsonSchema\General\normalize-content-common-keywords.json", @"Model\JsonSchema\General\normalize-content-common-keywords.json")]
        [InlineData(@"Model\JsonSchema\General\normalize-content-no-common-keywords.json", @"Model\JsonSchema\General\normalize-content-no-common-keywords-expected.json")]
        [InlineData(@"Model\JsonSchema\General\normalize-collection.json", @"Model\JsonSchema\General\normalize-collection-expected.json")]
        [InlineData(@"Model\JsonSchema\General\normalize-keyed-collection.json", @"Model\JsonSchema\General\normalize-keyed-collection-expected.json")]
        public async Task Normalize_WithNormalization_ShouldRemoveSingleAllOfs(string jsonSchemaTestdata, string expectedNormalizedSchemaTestdata)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var jsonSchema = await ResourceHelpers.LoadJsonSchemaTestData(jsonSchemaTestdata);

            var jsonSchemaNormalizer = new JsonSchemaNormalizer();
            var normalizedJsonSchema = jsonSchemaNormalizer.Normalize(jsonSchema);
            var normalizedJsonSchemaText = JsonSerializer.Serialize(normalizedJsonSchema);

            var expectedNormalizedJsonSchema = await ResourceHelpers.LoadJsonSchemaTestData(expectedNormalizedSchemaTestdata);
            var expectedNormalizedJsonSchemaText = JsonSerializer.Serialize(expectedNormalizedJsonSchema);

            var json = JsonSerializer.Serialize(normalizedJsonSchema, new JsonSerializerOptions { WriteIndented = true });

            normalizedJsonSchemaText.Should().BeEquivalentTo(expectedNormalizedJsonSchemaText);
        }
    }
}
