using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using SharedResources.Tests;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.BaseClasses;

public abstract class ConverterTestBase<TTestType, TKeywordHandler> : FluentTestsBase<TTestType>
    where TTestType : ConverterTestBase<TTestType, TKeywordHandler>
    where TKeywordHandler : IKeywordHandler
{
    protected JsonSchema JsonSchema { get; set; }

    protected KeywordData KeywordData { get; set; }

    protected string KeywordNodeJson { get; set; }

    protected ConverterTestBase()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    protected TTestType KeywordSerializedAsJson()
    {
        KeywordNodeJson = JsonSerializer.Serialize(
            JsonSchema,
            new JsonSerializerOptions()
            {
                Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
            }
        );
        return this as TTestType;
    }

    protected TTestType JsonSchemaLoaded(string json)
    {
        JsonSchema = JsonSchema.FromText(json, JsonSchemaKeywords.GetBuildOptions());
        return this as TTestType;
    }

    protected TTestType KeywordReadFromSchema()
    {
        KeywordData = JsonSchema.FindKeywordByHandler<TKeywordHandler>();
        return this as TTestType;
    }

    protected TTestType SerializedKeywordShouldBe(string json)
    {
        Assert.Equal(KeywordNodeJson, json);
        return this as TTestType;
    }

    protected TTestType KeywordShouldNotBeNull()
    {
        Assert.NotNull(KeywordData);
        return this as TTestType;
    }
}
