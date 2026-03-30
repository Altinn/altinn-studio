using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords
{
    public class XsdTextKeywordJsonConverterTests
    {
        private const string KeywordPlaceholder = "@xsdText";

        public XsdTextKeywordJsonConverterTests()
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
            var kd = schema.FindKeywordByHandler<XsdTextKeyword>();
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
    }
}
