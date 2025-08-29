using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using Xunit;

namespace DataModeling.Tests.Json.Keywords;

public class XsdRootElementKeywordTests : ValueKeywordTestsBase<XsdRootElementKeywordTests, XsdRootElementKeyword, string>
{
    protected override XsdRootElementKeyword CreateKeywordWithValue(string value) => new(value);

    [Theory]
    [InlineData("melding")]
    [InlineData("root")]
    public void SameKeywords_Should_BeEqual(string value)
    {
        var expectedKeyword = new XsdRootElementKeyword(value);
        object expectedKeywordObject = new XsdRootElementKeyword(value);
        Given.That.KeywordCreatedWithValue(value)
            .Then.KeywordShouldEqual(expectedKeyword)
            .And.KeywordShouldEqualObject(expectedKeywordObject)
            .But.KeywordShouldNotEqual(null);
    }

    [Theory]
    [InlineData("melding")]
    [InlineData("root")]
    public void GetHashCode_ShouldBe_As_Value(string value)
    {
        var expectedHashCode = value.GetHashCode();
        Given.That.KeywordCreatedWithValue(value);

        Assert.Equal(expectedHashCode, Keyword.GetHashCode());
    }
}
