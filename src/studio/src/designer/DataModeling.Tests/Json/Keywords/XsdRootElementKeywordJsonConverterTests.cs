using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json.Keywords
{
    public class XsdRootElementKeywordJsonConverterTests : ValueKeywordConverterTestBase<XsdRootElementKeywordJsonConverterTests, XsdRootElementKeyword, string>
    {
        private const string KeywordPlaceholder = "@xsdRootElement";

        protected override XsdRootElementKeyword CreateKeywordWithValue(string value) => new(value);

        [Theory]
        [InlineData("melding")]
        [InlineData("root")]
        public void Read_ValidJson_FromSchema(string value)
        {
            var jsonSchema = @$"{{
                ""{KeywordPlaceholder}"": ""{value}""
            }}";

            Given.That.JsonSchemaLoaded(jsonSchema)
                .When.KeywordReadFromSchema()
                .Then.Keyword.Should().NotBeNull();

            And.Keyword.Value.Should().Be(value);
        }

        [Theory]
        [InlineData("melding")]
        [InlineData("root")]
        public void Write_ValidStructure_ShouldWriteToJson(string value)
        {
            Given.That.KeywordCreatedWithValue(value)
                .When.KeywordSerializedAsJson()
                .Then.SerializedKeywordShouldBe($@"{{""{KeywordPlaceholder}"":""{value}""}}");
        }

        [Theory]
        [InlineData("test")]
        public void Read_InvalidJson_ShouldThrow(string value)
        {
            var jsonSchema = @$"{{
                    ""{KeywordPlaceholder}"": {{
                        ""value"": ""{value}""
                }}";

            var ex = Assert.Throws<JsonException>(() =>
                Given.That.JsonSchemaLoaded(jsonSchema));
            ex.Message.Should().Be("Expected string");
        }
    }
}
