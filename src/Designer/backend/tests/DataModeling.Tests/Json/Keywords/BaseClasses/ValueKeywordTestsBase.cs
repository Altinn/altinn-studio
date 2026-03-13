using System.Text.Json;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.BaseClasses;

public abstract class ValueKeywordTestsBase<TTestType, TKeywordHandler, TValueType>
    : KeywordTestsBase<TTestType, TKeywordHandler>
    where TTestType : KeywordTestsBase<TTestType, TKeywordHandler>
    where TKeywordHandler : IKeywordHandler
{
    protected TValueType ParsedValue { get; set; }

    protected abstract JsonElement CreateJsonElement(TValueType value);

    protected TTestType ValueParsedFromJson(TValueType value)
    {
        var element = CreateJsonElement(value);
        ParsedValue = (TValueType)Handler.ValidateKeywordValue(element);
        return this as TTestType;
    }

    protected TTestType ParsedValueShouldEqual(TValueType expected)
    {
        Assert.Equal(expected, ParsedValue);
        return this as TTestType;
    }
}
