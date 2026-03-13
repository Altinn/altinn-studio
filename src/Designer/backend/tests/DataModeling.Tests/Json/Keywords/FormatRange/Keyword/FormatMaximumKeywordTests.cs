using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.FormatRange.Keyword;

public class FormatMaximumKeywordTests
{
    public FormatMaximumKeywordTests()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    [Fact]
    public void Handler_Name_ShouldBe_FormatMaximum()
    {
        Assert.Equal("formatMaximum", FormatMaximumKeyword.Instance.Name);
    }

    [Theory]
    [InlineData("2022-10-18")]
    public void ValidateKeywordValue_ShouldParseString(string value)
    {
        var json = JsonSerializer.Serialize(value);
        var element = JsonDocument.Parse(json).RootElement;
        var result = FormatMaximumKeyword.Instance.ValidateKeywordValue(element);
        Assert.Equal(value, result);
    }
}
