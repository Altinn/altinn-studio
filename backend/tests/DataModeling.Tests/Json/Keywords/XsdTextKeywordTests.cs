using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json.Keywords;

public class XsdTextKeywordTests : ValueKeywordTestsBase<XsdTextKeywordTests, XsdTextKeyword, bool>
{
    protected override XsdTextKeyword CreateKeywordWithValue(bool value) => new(value);

    [Fact]
    public void DefaultValue_ShouldBe_False()
    {
        Keyword = new XsdTextKeyword();
        Keyword.Value.Should().Be(false);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void SameKeywords_Should_BeEqual(bool value)
    {
        var expectedKeyword = new XsdTextKeyword(value);
        object expectedKeywordObject = new XsdTextKeyword(value);
        Given.That.KeywordCreatedWithValue(value)
            .Then.KeywordShouldEqual(expectedKeyword)
            .And.KeywordShouldEqualObject(expectedKeywordObject)
            .But.KeywordShouldNotEqual(null);
    }
}
