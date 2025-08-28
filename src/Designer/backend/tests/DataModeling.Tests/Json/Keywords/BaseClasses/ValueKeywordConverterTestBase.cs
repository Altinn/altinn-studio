using Json.Schema;

namespace DataModeling.Tests.Json.Keywords.BaseClasses;

public abstract class ValueKeywordConverterTestBase<TTestType, TKeywordType, TValueType> : ConverterTestBase<TTestType, TKeywordType>
where TTestType : ValueKeywordConverterTestBase<TTestType, TKeywordType, TValueType>
where TKeywordType : IJsonSchemaKeyword
{
    protected abstract TKeywordType CreateKeywordWithValue(TValueType value);

    protected TTestType KeywordCreatedWithValue(TValueType value)
    {
        Keyword = CreateKeywordWithValue(value);
        return this as TTestType;
    }
}
