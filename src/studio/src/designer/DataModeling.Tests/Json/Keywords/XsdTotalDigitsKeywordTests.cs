using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json.Keywords;

public class XsdTotalDigitsKeywordTests: ValueKeywordTestsBase<XsdTotalDigitsKeywordTests, XsdTotalDigitsKeyword, uint>
{
    protected override XsdTotalDigitsKeyword CreateKeywordWithValue(uint value) => new(value);

    [Theory]
    [InlineData(1)]
    [InlineData(100)]
    public void CreatedKeyword_ShouldHaveValue(uint value)
    {
        Keyword = new XsdTotalDigitsKeyword(value);
        Keyword.Value.Should().Be(value);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(100)]
    public void SameKeywords_Should_BeEqual(uint value)
    {
        var expectedKeyword = new XsdTotalDigitsKeyword(value);
        object expectedKeywordObject = new XsdTotalDigitsKeyword(value);

        Given.That.KeywordCreatedWithValue(value)
            .Then.KeywordShouldEqual(expectedKeyword)
            .And.KeywordShouldEqualObject(expectedKeywordObject)
            .But.KeywordShouldNotEqual(null);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(100)]
    public void GetHashCode_ShouldBe_As_Value(uint value)
    {
        var expectedHashCode = value.GetHashCode();
        Given.That.KeywordCreatedWithValue(value);
        expectedHashCode.GetHashCode().Should().Be(Keyword.GetHashCode());
    }
}
