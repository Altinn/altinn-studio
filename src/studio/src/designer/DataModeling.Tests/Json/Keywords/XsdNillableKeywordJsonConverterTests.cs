using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json.Keywords
{
    public class XsdNillableKeywordJsonConverterTests : ValueKeywordConverterTestBase<XsdNillableKeywordJsonConverterTests, XsdNillableKeyword, bool>
    {
        private const string KeywordPlaceholder = "@xsdNillable";

        protected override XsdNillableKeyword CreateKeywordWithValue(bool value) => new(value);

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Read_ValidJson_FromSchema(bool value)
        {
            var jsonSchema = @$"{{
                ""{KeywordPlaceholder}"": {value.ToString().ToLower()}
            }}";

            Given.That.JsonSchemaLoaded(jsonSchema)
                .When.KeywordReadFromSchema()
                .Then.Keyword.Should().NotBeNull();

            And.Keyword.Value.Should().Be(value);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Write_ValidStructure_ShouldWriteToJson(bool value)
        {
            Given.That.KeywordCreatedWithValue(value)
                .When.KeywordSerializedAsJson()
                .Then.SerializedKeywordShouldBe($@"{{""{KeywordPlaceholder}"":{value.ToString().ToLower()}}}");
        }

        [Theory]
        [InlineData(true)]
        public void Read_InvalidJson_ShouldThrow(bool value)
        {
            var jsonSchema = @$"{{
                    ""{KeywordPlaceholder}"": {{
                        ""value"": ""{value}""
                }}";

            var ex = Assert.Throws<JsonException>(() =>
                Given.That.JsonSchemaLoaded(jsonSchema));
            ex.Message.Should().Be("Expected boolean");
        }
    }
}
