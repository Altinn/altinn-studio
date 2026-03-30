using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.OccursKeywords.Keyword;

public class XsdMinOccursKeywordTests
{
    public XsdMinOccursKeywordTests()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    [Fact]
    public void Handler_Name_ShouldBe_XsdMinOccurs()
    {
        Assert.Equal("@xsdMinOccurs", XsdMinOccursKeyword.Instance.Name);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(100)]
    public void ValidateKeywordValue_ShouldParseInt(int value)
    {
        var json = JsonSerializer.Serialize(value);
        var element = JsonDocument.Parse(json).RootElement;
        var result = XsdMinOccursKeyword.Instance.ValidateKeywordValue(element);
        Assert.Equal(value, result);
    }
}
