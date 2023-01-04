using System.IO;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using DataModeling.Tests.BaseClasses;
using FluentAssertions;
using Json.Schema;
using SharedResources.Tests;

namespace DataModeling.Tests.Json.Keywords.BaseClasses;

public abstract class ConverterTestBase<TTestType, TKeywordType> : FluentTestsBase<TTestType>
where TTestType : ConverterTestBase<TTestType, TKeywordType>
where TKeywordType : IJsonSchemaKeyword
{
    protected JsonSchema JsonSchema { get; set; }

    protected TKeywordType Keyword { get; set; }

    protected string KeywordNodeJson { get; set; }

    protected ConverterTestBase()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    protected TTestType KeywordSerializedAsJson()
    {
        var builder = new JsonSchemaBuilder();
        builder.Add(Keyword);
        var keywordNodeSchema = builder.Build();
        KeywordNodeJson = JsonSerializer.Serialize(keywordNodeSchema, new JsonSerializerOptions()
        {
            Encoder =
                JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement)
        });
        return this as TTestType;
    }

    protected TTestType JsonSchemaLoaded(string json)
    {
        JsonSchema = JsonSchema.FromText(json);
        return this as TTestType;
    }

    protected TTestType KeywordReadFromSchema()
    {
        Keyword = JsonSchema.GetKeyword<TKeywordType>();
        return this as TTestType;
    }

    protected TTestType SerializedKeywordShouldBe(string json)
    {
        KeywordNodeJson.Should().Be(json);
        return this as TTestType;
    }
}
