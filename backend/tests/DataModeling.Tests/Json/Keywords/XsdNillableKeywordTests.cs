using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using Xunit;

namespace DataModeling.Tests.Json.Keywords;

public class XsdNillableKeywordTests: ValueKeywordTestsBase<XsdNillableKeywordTests, XsdNillableKeyword, bool>
{
    protected override XsdNillableKeyword CreateKeywordWithValue(bool value) => new(value);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void SameKeywords_Should_BeEqual(bool value)
    {
        var expectedKeyword = new XsdNillableKeyword(value);
        object expectedKeywordObject = new XsdNillableKeyword(value);
        Given.That.KeywordCreatedWithValue(value)
            .Then.KeywordShouldEqual(expectedKeyword)
            .And.KeywordShouldEqualObject(expectedKeywordObject)
            .But.KeywordShouldNotEqual(null);
    }
}
