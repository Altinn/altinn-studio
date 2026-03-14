using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords
{
    public class XsdTotalDigitsKeywordJsonConverterTests
    {
        private const string KeywordPlaceholder = "totalDigits";

        public XsdTotalDigitsKeywordJsonConverterTests()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
        }

        [Theory]
        [InlineData(1)]
        [InlineData(100)]
        public void Read_ValidJson_FromSchema(uint value)
        {
            var jsonSchema =
                @$"{{
                ""{KeywordPlaceholder}"": {value}
            }}";

            var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
            var kd = schema.FindKeywordByHandler<XsdTotalDigitsKeyword>();
            Assert.NotNull(kd);
            Assert.Equal(value, kd.Value);
        }

        [Theory]
        [InlineData(1)]
        [InlineData(100)]
        public void Write_ValidStructure_ShouldWriteToJson(uint value)
        {
            var jsonSchema =
                @$"{{
                ""{KeywordPlaceholder}"": {value}
            }}";

            var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
            var serialized = JsonSerializer.Serialize(schema);
            Assert.Equal($@"{{""{KeywordPlaceholder}"":{value}}}", serialized);
        }

        [Theory]
        [InlineData(1)]
        public void Read_InvalidJson_ShouldThrow(uint value)
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
