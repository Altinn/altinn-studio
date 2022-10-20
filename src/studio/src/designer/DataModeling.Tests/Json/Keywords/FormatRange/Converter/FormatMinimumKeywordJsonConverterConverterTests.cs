using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.DataModeling.Json.Keywords;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.FormatRange.Converter;

public class FormatMinimumKeywordJsonConverterConverterTests : FormatRangeConverterTestBase<FormatMinimumKeywordJsonConverterConverterTests, FormatMinimumKeyword>
{
    private const string KeywordPlaceholder = "formatMinimum";

    protected override JsonConverter<FormatMinimumKeyword> Converter
        => new FormatMinimumKeyword.FormatMinimumKeywordJsonConverter();

    protected override FormatMinimumKeyword CreateKeywordWithValue(string value)
    {
        return new FormatMinimumKeyword(value);
    }

    [Theory]
    [InlineData("2022-10-17")]
    public void Write_ValidStructure_ShouldWriteToJson(string value)
    {
        Given.That.KeywordCreatedWithValue(value)
            .When.XsdTextKeywordWrittenToStream()
            .Then.SerializedKeywordShouldBe($@"{{""{KeywordPlaceholder}"":""{value}""}}");
    }

    [Theory]
    [InlineData("2022-10-17")]
    public void Read_ValidJson_FromSchema(string value)
    {
        var jsonSchema = @$"{{
                ""{KeywordPlaceholder}"": ""{value}""
            }}";

        Given.That.JsonSchemaLoaded(jsonSchema)
            .When.XsdTextKeywordReadFromSchema()
            .Then.Keyword.Should().NotBeNull();

        And.Keyword.Value.Should().Be(value);
    }

    [Theory]
    [InlineData("2022-10-17")]
    public void Read_InvalidJson_ShouldThrow(string value)
    {
        var jsonSchema = @$"{{
                    ""{KeywordPlaceholder}"": {{
                        ""value"": ""{value}""
                }}";

        var ex = Assert.Throws<JsonException>(() =>
            Given.That.JsonSchemaLoaded(jsonSchema));
        ex.Message.Should().Be("Expected string");
    }
}
