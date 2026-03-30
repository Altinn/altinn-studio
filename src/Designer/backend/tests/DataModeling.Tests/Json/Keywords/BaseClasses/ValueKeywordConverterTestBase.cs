using System.Text.Json;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;

namespace DataModeling.Tests.Json.Keywords.BaseClasses;

public abstract class ValueKeywordConverterTestBase<TTestType, TKeywordHandler, TValueType>
    : ConverterTestBase<TTestType, TKeywordHandler>
    where TTestType : ValueKeywordConverterTestBase<TTestType, TKeywordHandler, TValueType>
    where TKeywordHandler : IKeywordHandler
{
    protected abstract string BuildSchemaJson(TValueType value);

    protected TTestType KeywordCreatedWithValue(TValueType value)
    {
        var json = BuildSchemaJson(value);
        JsonSchema = JsonSchema.FromText(
            json,
            Altinn.Studio.DataModeling.Json.Keywords.JsonSchemaKeywords.GetBuildOptions()
        );
        KeywordData = JsonSchema.FindKeywordByHandler<TKeywordHandler>();
        return this as TTestType;
    }
}
