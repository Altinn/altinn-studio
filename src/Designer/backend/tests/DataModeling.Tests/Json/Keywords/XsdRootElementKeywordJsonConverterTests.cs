using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords
{
    public class XsdRootElementKeywordJsonConverterTests
    {
        private const string KeywordPlaceholder = "@xsdRootElement";

        public XsdRootElementKeywordJsonConverterTests()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
        }

        [Theory]
        [InlineData("melding")]
        [InlineData("root")]
        public void Read_ValidJson_FromSchema(string value)
        {
            var jsonSchema =
                @$"{{
                ""{KeywordPlaceholder}"": ""{value}""
            }}";

            var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
            var kd = schema.FindKeywordByHandler<XsdRootElementKeyword>();
            Assert.NotNull(kd);
            Assert.Equal(value, kd.Value);
        }

        [Theory]
        [InlineData("melding")]
        [InlineData("root")]
        public void Write_ValidStructure_ShouldWriteToJson(string value)
        {
            var jsonSchema =
                @$"{{
                ""{KeywordPlaceholder}"": ""{value}""
            }}";

            var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
            var serialized = JsonSerializer.Serialize(schema);
            Assert.Equal($@"{{""{KeywordPlaceholder}"":""{value}""}}", serialized);
        }

        [Theory]
        [InlineData("test")]
        public void Read_InvalidJson_ShouldThrow(string value)
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
