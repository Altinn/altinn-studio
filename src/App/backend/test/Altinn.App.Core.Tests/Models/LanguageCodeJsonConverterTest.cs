using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Models;

public class LanguageCodeJsonConverterTest
{
    public record TestObject
    {
        [JsonConverter(typeof(LanguageCodeJsonConverter<Iso6391>))]
        public LanguageCode<Iso6391> Value { get; init; }
    }

    [Theory]
    [InlineData("nb", "nb")]
    [InlineData("en", "en")]
    public void JsonDeserialisesCorrectly(string incomingJsonData, string expectedParsedCode)
    {
        // Arrange
        var json = $$"""
            {
                "Value": "{{incomingJsonData}}"
            }
            """;

        // Act
        var result = JsonSerializer.Deserialize<TestObject>(json);

        // Assert
        Assert.NotNull(result);
        result.Value.Should().Be(expectedParsedCode);
    }

    [Theory]
    [InlineData("nb", "nb")]
    public void JsonSerialisesCorrectly(string originalValue, string expectedJsonResult)
    {
        // Arrange
        var data = new TestObject { Value = LanguageCode<Iso6391>.Parse(originalValue) };

        // Act
        var result = JsonSerializer.Serialize(data);

        // Assert
        Assert.NotNull(result);
        result.Should().MatchRegex($"\"Value\":*.\"{expectedJsonResult}\"");
    }
}
