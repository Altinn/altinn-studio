using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using Xunit;

namespace DataModeling.Tests.Json.Keywords
{
    public class XsdTextKeywordJsonConverterTests : ValueKeywordConverterTestBase<XsdTextKeywordJsonConverterTests, XsdTextKeyword, bool>
    {
        private const string KeywordPlaceholder = "@xsdText";

        protected override XsdTextKeyword CreateKeywordWithValue(bool value) => new(value);

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
                .Then.KeywordShouldNotBeNull();

            Assert.Equal(Keyword.Value, value);
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
    }
}
