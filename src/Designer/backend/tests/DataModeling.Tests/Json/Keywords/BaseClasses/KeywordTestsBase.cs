using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;
using SharedResources.Tests;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.BaseClasses;

public abstract class KeywordTestsBase<TTestType, TKeywordHandler> : FluentTestsBase<TTestType>
    where TTestType : KeywordTestsBase<TTestType, TKeywordHandler>
    where TKeywordHandler : IKeywordHandler
{
    protected TKeywordHandler Handler { get; set; }

    protected KeywordTestsBase()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    protected object ValidateValue(JsonElement element)
    {
        return Handler.ValidateKeywordValue(element);
    }
}
