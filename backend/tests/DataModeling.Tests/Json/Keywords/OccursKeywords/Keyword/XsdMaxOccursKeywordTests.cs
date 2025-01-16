using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.OccursKeywords.Keyword;

public class XsdMaxOccursKeywordTests : ValueKeywordTestsBase<XsdMaxOccursKeywordTests, XsdMaxOccursKeyword, string>
{
    protected override XsdMaxOccursKeyword CreateKeywordWithValue(string value) => new(value);

    [Theory]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("100")]
    [InlineData("unbounded")]
    public void CreatedKeyword_ShouldHaveValue(string value)
    {
        Keyword = new XsdMaxOccursKeyword(value);
        Assert.Equal(value, Keyword.Value);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("100")]
    [InlineData("unbounded")]
    public void SameKeywords_Should_BeEqual(string value)
    {
        var expectedKeyword = new XsdMaxOccursKeyword(value);
        object expectedKeywordObject = new XsdMaxOccursKeyword(value);

        Given.That.KeywordCreatedWithValue(value)
            .Then.KeywordShouldEqual(expectedKeyword)
            .And.KeywordShouldEqualObject(expectedKeywordObject)
            .But.KeywordShouldNotEqual(null);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("100")]
    [InlineData("unbounded")]
    public void GetHashCode_ShouldBe_As_Value(string value)
    {
        var expectedHashCode = value.GetHashCode();
        Given.That.KeywordCreatedWithValue(value);

        Assert.Equal(expectedHashCode, Keyword.GetHashCode());
    }
}
