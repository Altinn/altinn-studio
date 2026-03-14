using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords
{
    public class XsdNillableKeywordJsonConverterTests
    {
        private const string KeywordPlaceholder = "@xsdNillable";

        public XsdNillableKeywordJsonConverterTests()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Read_ValidJson_FromSchema(bool value)
        {
            var jsonSchema =
                @$"{{
                ""{KeywordPlaceholder}"": {value.ToString().ToLower()}
            }}";

            var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
            var kd = schema.FindKeywordByHandler<XsdNillableKeyword>();
            Assert.NotNull(kd);
            Assert.Equal(value, kd.Value);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Write_ValidStructure_ShouldWriteToJson(bool value)
        {
            var jsonSchema =
                @$"{{
                ""{KeywordPlaceholder}"": {value.ToString().ToLower()}
            }}";

            var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
            var serialized = JsonSerializer.Serialize(schema);
            Assert.Equal($@"{{""{KeywordPlaceholder}"":{value.ToString().ToLower()}}}", serialized);
        }

        [Theory]
        [InlineData(true)]
        public void Read_InvalidJson_ShouldThrow(bool value)
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
