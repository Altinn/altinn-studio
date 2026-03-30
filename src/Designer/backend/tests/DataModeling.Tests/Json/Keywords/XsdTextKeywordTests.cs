using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Xunit;

namespace DataModeling.Tests.Json.Keywords;

public class XsdTextKeywordTests
{
    public XsdTextKeywordTests()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    [Fact]
    public void Handler_Name_ShouldBe_XsdText()
    {
        Assert.Equal("@xsdText", XsdTextKeyword.Instance.Name);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ValidateKeywordValue_ShouldParseBool(bool value)
    {
        var json = JsonSerializer.Serialize(value);
        var element = JsonDocument.Parse(json).RootElement;
        var result = XsdTextKeyword.Instance.ValidateKeywordValue(element);
        Assert.Equal(value, result);
    }
}
