using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.OccursKeywords.Converter
{
    public class XsdMaxOccursKeywordJsonConverterTests : ValueKeywordConverterTestBase<XsdMaxOccursKeywordJsonConverterTests, XsdMaxOccursKeyword, string>
    {
        private const string KeywordPlaceholder = "@xsdMaxOccurs";

        protected override XsdMaxOccursKeyword CreateKeywordWithValue(string value) => new(value);

        [Theory]
        [InlineData("0")]
        [InlineData("1")]
        [InlineData("unbounded")]
        public void Read_ValidJson_FromSchema(string value)
        {
            var jsonSchema = @$"{{
                ""{KeywordPlaceholder}"": ""{value}""
            }}";

            Given.That.JsonSchemaLoaded(jsonSchema)
                .When.KeywordReadFromSchema()
                .Then.KeywordShouldNotBeNull();

            Assert.Equal(Keyword.Value, value);
        }

        [Theory]
        [InlineData("0")]
        [InlineData("1")]
        [InlineData("unbounded")]
        public void Write_ValidStructure_ShouldWriteToJson(string value)
        {
            Given.That.KeywordCreatedWithValue(value)
                .When.KeywordSerializedAsJson()
                .Then.SerializedKeywordShouldBe($@"{{""{KeywordPlaceholder}"":""{value}""}}");
        }

        [Theory]
        [InlineData("1")]
        public void Read_InvalidJson_ShouldThrow(string value)
        {
            var jsonSchema = @$"{{
                    ""{KeywordPlaceholder}"": {{
                        ""value"": ""{value}""
                }}";

            var ex = Assert.Throws<JsonException>(() =>
                Given.That.JsonSchemaLoaded(jsonSchema));

            Assert.Equal("Expected string", ex.Message);
        }
    }
}
