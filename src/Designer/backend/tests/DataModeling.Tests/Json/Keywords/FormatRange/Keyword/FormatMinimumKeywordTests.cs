using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.FormatRange.Keyword;

public class FormatMinimumKeywordTests
{
    public FormatMinimumKeywordTests()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    [Fact]
    public void Handler_Name_ShouldBe_FormatMinimum()
    {
        Assert.Equal("formatMinimum", FormatMinimumKeyword.Instance.Name);
    }

    [Theory]
    [InlineData("2022-10-18")]
    public void ValidateKeywordValue_ShouldParseString(string value)
    {
        var json = JsonSerializer.Serialize(value);
        var element = JsonDocument.Parse(json).RootElement;
        var result = FormatMinimumKeyword.Instance.ValidateKeywordValue(element);
        Assert.Equal(value, result);
    }
}
