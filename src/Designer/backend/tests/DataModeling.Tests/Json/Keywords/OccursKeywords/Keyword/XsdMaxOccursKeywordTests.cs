using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.OccursKeywords.Keyword;

public class XsdMaxOccursKeywordTests
{
    public XsdMaxOccursKeywordTests()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    [Fact]
    public void Handler_Name_ShouldBe_XsdMaxOccurs()
    {
        Assert.Equal("@xsdMaxOccurs", XsdMaxOccursKeyword.Instance.Name);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("100")]
    [InlineData("unbounded")]
    public void ValidateKeywordValue_ShouldParseString(string value)
    {
        var json = JsonSerializer.Serialize(value);
        var element = JsonDocument.Parse(json).RootElement;
        var result = XsdMaxOccursKeyword.Instance.ValidateKeywordValue(element);
        Assert.Equal(value, result);
    }
}
