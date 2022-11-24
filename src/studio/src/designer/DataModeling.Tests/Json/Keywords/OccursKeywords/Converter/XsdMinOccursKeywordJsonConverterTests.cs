using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.OccursKeywords.Converter
{
    public class XsdMinOccursKeywordJsonConverterTests : ValueKeywordConverterTestBase<XsdMinOccursKeywordJsonConverterTests, XsdMinOccursKeyword, int>
    {
        private const string KeywordPlaceholder = "@xsdMinOccurs";

        protected override XsdMinOccursKeyword CreateKeywordWithValue(int value) => new(value);

        [Theory]
        [InlineData(0)]
        [InlineData(1)]
        [InlineData(100)]
        public void Read_ValidJson_FromSchema(int value)
        {
            var jsonSchema = @$"{{
                ""{KeywordPlaceholder}"": {value}
            }}";

            Given.That.JsonSchemaLoaded(jsonSchema)
                .When.KeywordReadFromSchema()
                .Then.Keyword.Should().NotBeNull();

            And.Keyword.Value.Should().Be(value);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(1)]
        [InlineData(100)]
        public void Write_ValidStructure_ShouldWriteToJson(int value)
        {
            Given.That.KeywordCreatedWithValue(value)
                .When.KeywordSerializedAsJson()
                .Then.SerializedKeywordShouldBe($@"{{""{KeywordPlaceholder}"":{value}}}");
        }

        [Theory]
        [InlineData(1)]
        public void Read_InvalidJson_ShouldThrow(int value)
        {
            var jsonSchema = @$"{{
                    ""{KeywordPlaceholder}"": {{
                        ""value"": ""{value}""
                }}";

            var ex = Assert.Throws<JsonException>(() =>
                Given.That.JsonSchemaLoaded(jsonSchema));
            ex.Message.Should().Be("Expected number");
        }
    }
}
