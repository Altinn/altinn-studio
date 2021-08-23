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
        [InlineData(@"Model\JsonSchema\AltinnAnnotation.json")]
        [InlineData(@"Model\JsonSchema\Any.json")]
        [InlineData(@"Model\JsonSchema\Attributes.json")]
        [InlineData(@"Model\JsonSchema\BuiltinTypes.json")]
        [InlineData(@"Model\JsonSchema\ComplexContentExtension.json")]
        [InlineData(@"Model\JsonSchema\ComplexContentRestriction.json")]
        [InlineData(@"Model\JsonSchema\ComplexSchema.json")]
        [InlineData(@"Model\JsonSchema\Definitions.json")]
        [InlineData(@"Model\JsonSchema\ElementAnnotation.json")]
        [InlineData(@"Model\JsonSchema\InterleavedNestedSequences.json")]
        [InlineData(@"Model\JsonSchema\NestedArrays.json")]
        [InlineData(@"Model\JsonSchema\NestedChoice.json")]
        [InlineData(@"Model\JsonSchema\NestedSequence.json")]
        [InlineData(@"Model\JsonSchema\NestedSequences.json")]
        [InlineData(@"Model\JsonSchema\NestedWithArrayChoice.json")]
        [InlineData(@"Model\JsonSchema\NestedWithArraySequence.json")]
        [InlineData(@"Model\JsonSchema\NestedWithOptionalChoice.json")]
        [InlineData(@"Model\JsonSchema\NestedWithOptionalSequence.json")]
        [InlineData(@"Model\JsonSchema\SimpleAll.json")]
        [InlineData(@"Model\JsonSchema\SimpleChoice.json")]
        [InlineData(@"Model\JsonSchema\SimpleContentExtension.json")]
        [InlineData(@"Model\JsonSchema\SimpleContentRestriction.json")]
        [InlineData(@"Model\JsonSchema\SimpleSequence.json")]
        [InlineData(@"Model\JsonSchema\SimpleTypeList.json")]
        [InlineData(@"Model\JsonSchema\SimpleTypeRestrictions.json")]
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
        [InlineData(@"Model\JsonSchema\AltinnAnnotation.json", @"Model\JsonSchema\AltinnAnnotation_Normalized.json")]
        [InlineData(@"Model\JsonSchema\normalize-root.json", @"Model\JsonSchema\normalize-root-expected.json")]
        [InlineData(@"Model\JsonSchema\normalize-root-ref.json", @"Model\JsonSchema\normalize-root-ref.json")]
        [InlineData(@"Model\JsonSchema\normalize-content.json", @"Model\JsonSchema\normalize-content-expected.json")]
        [InlineData(@"Model\JsonSchema\normalize-content-ref.json", @"Model\JsonSchema\normalize-content-ref-expected.json")]
        [InlineData(@"Model\JsonSchema\normalize-content-common-keywords.json", @"Model\JsonSchema\normalize-content-common-keywords.json")]
        [InlineData(@"Model\JsonSchema\normalize-content-no-common-keywords.json", @"Model\JsonSchema\normalize-content-no-common-keywords-expected.json")]
        [InlineData(@"Model\JsonSchema\normalize-collection.json", @"Model\JsonSchema\normalize-collection-expected.json")]
        [InlineData(@"Model\JsonSchema\normalize-keyed-collection.json", @"Model\JsonSchema\normalize-keyed-collection-expected.json")]
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
