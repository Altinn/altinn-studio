using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.FormatRange.Keyword;

public abstract class FormatRangeKeywordTestsBase<TTestType, TKeywordType> : FluentTestsBase<TTestType>
    where TTestType : FormatRangeKeywordTestsBase<TTestType, TKeywordType>
    where TKeywordType : IJsonSchemaKeyword
{
    protected TKeywordType Keyword { get; set; }

    protected abstract TKeywordType CreateKeywordWithValue(string value);

    protected TTestType KeywordCreatedWithValue(string value)
    {
        Keyword = CreateKeywordWithValue(value);
        return this as TTestType;
    }

    protected TTestType KeywordShouldEqual(TKeywordType expectedKeyword)
    {
        Assert.True(Keyword.Equals(expectedKeyword));
        return this as TTestType;
    }

    protected TTestType KeywordShouldEqualObject(object obj)
    {
        Assert.True(Keyword.Equals(obj));
        return this as TTestType;
    }

    protected TTestType KeywordShouldNotEqual(TKeywordType expectedKeyword)
    {
        Assert.False(Keyword.Equals(expectedKeyword));
        return this as TTestType;
    }
}
