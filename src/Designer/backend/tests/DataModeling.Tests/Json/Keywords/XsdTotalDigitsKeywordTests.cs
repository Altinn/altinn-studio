using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords;

public class XsdTotalDigitsKeywordTests
{
    private const string KeywordPlaceholder = "totalDigits";

    public XsdTotalDigitsKeywordTests()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    [Fact]
    public void Handler_Name_ShouldBe_TotalDigits()
    {
        Assert.Equal("totalDigits", XsdTotalDigitsKeyword.Instance.Name);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(100)]
    public void ValidateKeywordValue_ShouldParseUint(uint value)
    {
        var json = JsonSerializer.Serialize(value);
        var element = JsonDocument.Parse(json).RootElement;
        var result = XsdTotalDigitsKeyword.Instance.ValidateKeywordValue(element);
        Assert.Equal(value, result);
    }

    [Theory]
    [InlineData(4, "1234", true)]
    [InlineData(3, "1234", false)]
    [InlineData(2, "2.234", false)]
    [InlineData(4, "2.234", true)]
    [InlineData(4, "2.12", true)]
    public void Keyword_ShouldValidate(uint totalDigitsValue, string jsonDataValue, bool shouldBeValid)
    {
        var schema = JsonSchema.FromText(TotalDigitsSchema(totalDigitsValue), JsonSchemaKeywords.GetBuildOptions());
        var element = JsonDocument.Parse(TotalDigitsJson(jsonDataValue)).RootElement;
        var validationResults = schema.Evaluate(element);
        Assert.Equal(shouldBeValid, validationResults.IsValid);
    }

    private static string TotalDigitsSchema(uint value) =>
        @$"
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

    private static string TotalDigitsJson(string value) =>
        @$"{{
                ""digitsExample"": {value}
        }}";
}
