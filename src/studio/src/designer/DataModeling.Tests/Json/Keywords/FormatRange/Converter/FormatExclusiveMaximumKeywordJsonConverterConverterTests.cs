using System.Text.Json.Serialization;
using Altinn.Studio.DataModeling.Json.Keywords;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.FormatRange;

public class FormatExclusiveMaximumKeywordJsonConverterConverterTests : FormatRangeConverterTestBase<FormatExclusiveMaximumKeywordJsonConverterConverterTests, FormatExclusiveMaximumKeyword>
{
    private const string KeywordPlaceholder = "formatExclusiveMaximum";

    protected override JsonConverter<FormatExclusiveMaximumKeyword> Converter
        => new FormatExclusiveMaximumKeyword.FormatExclusiveMaximumKeywordJsonConverter();

    protected override FormatExclusiveMaximumKeyword CreateKeywordWithValue(string value)
    {
        return new FormatExclusiveMaximumKeyword(value);
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
}
