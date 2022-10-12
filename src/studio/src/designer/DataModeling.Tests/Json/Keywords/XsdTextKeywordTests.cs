using Altinn.Studio.DataModeling.Json.Keywords;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json.Keywords;

public class XsdTextKeywordTests: FluentTestsBase<XsdTextKeywordTests>
{
    private XsdTextKeyword XsdTextKeyword { get; set; }

    [Fact]
    public void DefaultValue_ShouldBe_False()
    {
        XsdTextKeyword = new XsdTextKeyword();
        XsdTextKeyword.Value.Should().Be(false);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void SameKeywords_Should_BeEqual(bool value)
    {
        var expectedKeyword = new XsdTextKeyword(value);
        object expectedKeywordObject = new XsdTextKeyword(value);
        Given.That.XsdTextKeywordCreatedWithValue(value)
            .Then.XsdTextKeywordShouldEqual(expectedKeyword)
            .And.XsdTextKeywordShouldEqualObject(expectedKeywordObject)
            .But.XsdTextKeywordShouldNotEqual(null);
    }

    private XsdTextKeywordTests XsdTextKeywordCreatedWithValue(bool value)
    {
        XsdTextKeyword = new XsdTextKeyword(value);
        return this;
    }

    private XsdTextKeywordTests XsdTextKeywordShouldEqual(XsdTextKeyword expectedKeyword)
    {
        Assert.True(XsdTextKeyword.Equals(expectedKeyword));
        return this;
    }

    private XsdTextKeywordTests XsdTextKeywordShouldEqualObject(object obj)
    {
        Assert.True(XsdTextKeyword.Equals(obj));
        return this;
    }

    private XsdTextKeywordTests XsdTextKeywordShouldNotEqual(XsdTextKeyword expectedKeyword)
    {
        Assert.False(XsdTextKeyword.Equals(expectedKeyword));
        return this;
    }
}
