using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Xunit;

namespace DataModeling.Tests.Json.Keywords;

public class XsdRootElementKeywordTests
{
    public XsdRootElementKeywordTests()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    [Fact]
    public void Handler_Name_ShouldBe_XsdRootElement()
    {
        Assert.Equal("@xsdRootElement", XsdRootElementKeyword.Instance.Name);
    }

    [Theory]
    [InlineData("melding")]
    [InlineData("root")]
    public void ValidateKeywordValue_ShouldParseString(string value)
    {
        var json = JsonSerializer.Serialize(value);
        var element = JsonDocument.Parse(json).RootElement;
        var result = XsdRootElementKeyword.Instance.ValidateKeywordValue(element);
        Assert.Equal(value, result);
    }
}
