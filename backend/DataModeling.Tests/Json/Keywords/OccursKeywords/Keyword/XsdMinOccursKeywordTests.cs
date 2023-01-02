using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.OccursKeywords.Keyword;

public class XsdMinOccursKeywordTests: ValueKeywordTestsBase<XsdMinOccursKeywordTests, XsdMinOccursKeyword, int>
{
    protected override XsdMinOccursKeyword CreateKeywordWithValue(int value) => new(value);

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(100)]
    public void CreatedKeyword_ShouldHaveValue(int value)
    {
        Keyword = new XsdMinOccursKeyword(value);
        Keyword.Value.Should().Be(value);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(100)]
    public void SameKeywords_Should_BeEqual(int value)
    {
        var expectedKeyword = new XsdMinOccursKeyword(value);
        object expectedKeywordObject = new XsdMinOccursKeyword(value);

        Given.That.KeywordCreatedWithValue(value)
            .Then.KeywordShouldEqual(expectedKeyword)
            .And.KeywordShouldEqualObject(expectedKeywordObject)
            .But.KeywordShouldNotEqual(null);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(100)]
    public void GetHashCode_ShouldBe_As_Value(int value)
    {
        var expectedHashCode = value.GetHashCode();
        Given.That.KeywordCreatedWithValue(value);
        expectedHashCode.GetHashCode().Should().Be(Keyword.GetHashCode());
    }
}
