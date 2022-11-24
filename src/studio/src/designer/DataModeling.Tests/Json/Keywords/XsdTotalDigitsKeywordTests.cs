using System.Text.Json.Nodes;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using FluentAssertions;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords;

public class XsdTotalDigitsKeywordTests: ValueKeywordTestsBase<XsdTotalDigitsKeywordTests, XsdTotalDigitsKeyword, uint>
{
    private const string KeywordPlaceholder = "totalDigits";

    protected override XsdTotalDigitsKeyword CreateKeywordWithValue(uint value) => new(value);

    [Theory]
    [InlineData(1)]
    [InlineData(100)]
    public void CreatedKeyword_ShouldHaveValue(uint value)
    {
        Keyword = new XsdTotalDigitsKeyword(value);
        Keyword.Value.Should().Be(value);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(100)]
    public void SameKeywords_Should_BeEqual(uint value)
    {
        var expectedKeyword = new XsdTotalDigitsKeyword(value);
        object expectedKeywordObject = new XsdTotalDigitsKeyword(value);

        Given.That.KeywordCreatedWithValue(value)
            .Then.KeywordShouldEqual(expectedKeyword)
            .And.KeywordShouldEqualObject(expectedKeywordObject)
            .But.KeywordShouldNotEqual(null);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(100)]
    public void GetHashCode_ShouldBe_As_Value(uint value)
    {
        var expectedHashCode = value.GetHashCode();
        Given.That.KeywordCreatedWithValue(value);
        expectedHashCode.GetHashCode().Should().Be(Keyword.GetHashCode());
    }

    [Theory]
    [InlineData(4, "1234", true)]
    [InlineData(3, "1234", false)]
    [InlineData(2, "2.234", false)]
    [InlineData(4, "2.234", true)]
    [InlineData(4, "2.12", true)]
    public void Keyword_ShouldValidate(uint totalDigitsValue, string jsonDataValue, bool shouldBeValid)
    {
        var schema = JsonSchema.FromText(TotalDigitsSchema(totalDigitsValue));
        var node = JsonNode.Parse(TotalDigitsJson(jsonDataValue));
        var validationResults = schema.Validate(node, new ValidationOptions { ProcessCustomKeywords = true });
        shouldBeValid.Should().Be(validationResults.IsValid);
    }

    private static string TotalDigitsSchema(uint value) => @$"
                {{
                  ""$id"": ""totaldigits.schema.json"",
                  ""$schema"": ""https://json-schema.org/draft/2020-12/schema"",
                  ""title"": ""TotalDigits"",
                  ""type"": ""object"",
                  ""properties"": {{
                    ""digitsExample"": {{
                      ""type"": ""number"",
                      ""{KeywordPlaceholder}"": {value}
                    }}
                  }}
                }}
            ";

    private static string TotalDigitsJson(string value) => @$"{{
                ""digitsExample"": {value}
        }}";
}
