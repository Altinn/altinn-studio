using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.FormatRange.Converter;

public class FormatExclusiveMaximumKeywordJsonConverterConverterTests
{
    private const string KeywordPlaceholder = "formatExclusiveMaximum";

    public FormatExclusiveMaximumKeywordJsonConverterConverterTests()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
    }

    [Theory]
    [InlineData("2022-10-17")]
    public void Write_ValidStructure_ShouldWriteToJson(string value)
    {
        var jsonSchema = @$"{{""{KeywordPlaceholder}"":""{value}""}}";
        var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
        var serialized = JsonSerializer.Serialize(schema);
        Assert.Equal(jsonSchema, serialized);
    }

    [Theory]
    [InlineData("2022-10-17")]
    public void Read_ValidJson_FromSchema(string value)
    {
        var jsonSchema =
            @$"{{
                ""{KeywordPlaceholder}"": ""{value}""
            }}";

        var schema = JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions());
        var kd = schema.FindKeywordByHandler<FormatExclusiveMaximumKeyword>();
        Assert.NotNull(kd);
        Assert.Equal(value, kd.Value);
    }

    [Theory]
    [InlineData("2022-10-17")]
    public void Read_InvalidJson_ShouldThrow(string value)
    {
        var jsonSchema =
            @$"{{
                    ""{KeywordPlaceholder}"": {{
                        ""value"": ""{value}""
                }}";

        Assert.ThrowsAny<JsonException>(() => JsonSchema.FromText(jsonSchema, JsonSchemaKeywords.GetBuildOptions()));
    }
}
