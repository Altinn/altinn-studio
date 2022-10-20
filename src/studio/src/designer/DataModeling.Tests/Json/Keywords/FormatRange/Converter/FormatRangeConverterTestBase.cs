using System.IO;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using FluentAssertions;
using Json.Schema;

namespace DataModeling.Tests.Json.Keywords.FormatRange.Converter;

public abstract class FormatRangeConverterTestBase<TTestType, TKeywordType> : FluentTestsBase<TTestType>
where TTestType : FormatRangeConverterTestBase<TTestType, TKeywordType>
where TKeywordType : IJsonSchemaKeyword
{
    protected JsonSchema JsonSchema { get; set; }

    protected MemoryStream SerializedKeyword { get; set; }

    protected TKeywordType Keyword { get; set; }

    protected abstract JsonConverter<TKeywordType> Converter { get;  }

    protected FormatRangeConverterTestBase()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    protected abstract TKeywordType CreateKeywordWithValue(string value);

    protected TTestType KeywordCreatedWithValue(string value)
    {
        Keyword = CreateKeywordWithValue(value);
        return this as TTestType;
    }

    protected TTestType XsdTextKeywordWrittenToStream()
    {
        SerializedKeyword = new MemoryStream();
        var jsonWriter = new Utf8JsonWriter(SerializedKeyword);
        jsonWriter.WriteStartObject();
        Converter.Write(jsonWriter, Keyword, new JsonSerializerOptions());
        jsonWriter.WriteEndObject();
        jsonWriter.Flush();
        return this as TTestType;
    }

    protected TTestType JsonSchemaLoaded(string json)
    {
        JsonSchema = JsonSerializer.Deserialize<JsonSchema>(
            json,
            new JsonSerializerOptions { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
        return this as TTestType;
    }

    protected TTestType XsdTextKeywordReadFromSchema()
    {
        Keyword = JsonSchema.GetKeyword<TKeywordType>();
        return this as TTestType;
    }

    protected TTestType SerializedKeywordShouldBe(string json)
    {
        SerializedKeyword.Seek(0, SeekOrigin.Begin);
        var streamReader = new StreamReader(SerializedKeyword);
        var jsonText = streamReader.ReadToEnd();

        jsonText.Should().Be(json);
        return this as TTestType;
    }
}
