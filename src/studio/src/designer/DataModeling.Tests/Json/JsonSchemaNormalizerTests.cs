using System.Text.Json;
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
            var jsonSchemaText = JsonSerializer.Serialize(jsonSchema);

            var jsonSchemaNormalizer = new JsonSchemaNormalizer() { NoNormalization = true };

            var normalizedJsonSchema = jsonSchemaNormalizer.Normalize(jsonSchema);
            var normalizedJsonSchemaText = JsonSerializer.Serialize(normalizedJsonSchema);

            normalizedJsonSchemaText.Should().BeEquivalentTo(jsonSchemaText);            
        }
    }
}
