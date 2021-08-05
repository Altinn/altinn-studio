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
        public async Task Normalize_NoNormalizing_ShouldEqualSourceSchema(string jsonSchemaTestdata)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var jsonSchema = await ResourceHelpers.LoadJsonSchemaTestData(jsonSchemaTestdata);
            var jsonSchemaText = JsonSerializer.Serialize(jsonSchema);

            var normalizedJsonSchema = new JsonSchemaNormalizer().Normalize(jsonSchema);
            var normalizedJsonSchemaText = JsonSerializer.Serialize(normalizedJsonSchema);

            normalizedJsonSchemaText.Should().BeEquivalentTo(jsonSchemaText);            
        }
    }
}
