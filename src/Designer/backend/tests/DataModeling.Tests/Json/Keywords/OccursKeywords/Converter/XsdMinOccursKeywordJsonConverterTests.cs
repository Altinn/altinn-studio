using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.OccursKeywords.Converter
{
    public class XsdMinOccursKeywordJsonConverterTests
    {
        private const string KeywordPlaceholder = "@xsdMinOccurs";

        public XsdMinOccursKeywordJsonConverterTests()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
        }

        [Theory]
        [InlineData(0)]
        [InlineData(1)]
        [InlineData(100)]
        public void Read_ValidJson_FromSchema(int value)
        {
            var jsonSchema =
                @$"{{
                ""{KeywordPlaceholder}"": {value}
            }}";

            var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
            var kd = schema.FindKeywordByHandler<XsdMinOccursKeyword>();
            Assert.NotNull(kd);
            Assert.Equal(value, kd.Value);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(1)]
        [InlineData(100)]
        public void Write_ValidStructure_ShouldWriteToJson(int value)
        {
            var jsonSchema = @$"{{""{KeywordPlaceholder}"":{value}}}";
            var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
            var serialized = JsonSerializer.Serialize(schema);
            Assert.Equal(jsonSchema, serialized);
        }

        [Theory]
        [InlineData(1)]
        public void Read_InvalidJson_ShouldThrow(int value)
        {
            var jsonSchema =
                @$"{{
                    ""{KeywordPlaceholder}"": {{
                        ""value"": ""{value}""
                }}";

            Assert.ThrowsAny<JsonException>(() =>
                JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions())
            );
        }
    }
}
