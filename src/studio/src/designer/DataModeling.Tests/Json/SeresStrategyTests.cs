using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json.Keywords;
using FluentAssertions;
using Json.Pointer;
using Xunit;

namespace DataModeling.Tests.Json
{
    public class SeresStrategyTests
    {
        [Theory]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema.json")]
        public async Task Analyze_Seres_Converted_JsonSchema(string path)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var schema = await ResourceHelpers.LoadJsonSchemaTestData(path);
            var analyzer = new JsonSchemaSeresAnalyzer();

            var metadata = analyzer.AnalyzeSchema(schema);

            metadata.GetCompatibleTypes(JsonPointer.Parse("#")).Should().Equal(CompatibleXsdType.Unknown);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/oneOf/[0]")).Should().Equal(CompatibleXsdType.Unknown);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/melding-modell")).Should().Equal(CompatibleXsdType.ComplexType);
            metadata.GetCompatibleTypes(JsonPointer.Parse("#/$defs/melding-modell/properties/e1")).Should().Equal(CompatibleXsdType.SimpleType);
        }
    }
}
