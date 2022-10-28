using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.BaseClasses;

public abstract class KeywordTestsBase<TTestType, TKeywordType> : FluentTestsBase<TTestType>
    where TTestType : KeywordTestsBase<TTestType, TKeywordType>
    where TKeywordType : IJsonSchemaKeyword
{
    protected TKeywordType Keyword { get; set; }

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
