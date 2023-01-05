using Json.Schema;

namespace DataModeling.Tests.Json.Keywords.BaseClasses;

public abstract class ValueKeywordTestsBase<TTestType, TKeywordType, TValueType> : KeywordTestsBase<TTestType, TKeywordType>
    where TTestType : KeywordTestsBase<TTestType, TKeywordType>
    where TKeywordType : IJsonSchemaKeyword
{
    protected abstract TKeywordType CreateKeywordWithValue(TValueType value);

    protected TTestType KeywordCreatedWithValue(TValueType value)
    {
        Keyword = CreateKeywordWithValue(value);
        return this as TTestType;
    }
}
