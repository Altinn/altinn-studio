using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Xunit;

namespace DataModeling.Tests.Json.Keywords;

public class XsdNillableKeywordTests
{
    public XsdNillableKeywordTests()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    [Fact]
    public void Handler_Name_ShouldBe_XsdNillable()
    {
        Assert.Equal("@xsdNillable", XsdNillableKeyword.Instance.Name);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ValidateKeywordValue_ShouldParseBool(bool value)
    {
        var json = JsonSerializer.Serialize(value);
        var element = JsonDocument.Parse(json).RootElement;
        var result = XsdNillableKeyword.Instance.ValidateKeywordValue(element);
        Assert.Equal(value, result);
    }
}
