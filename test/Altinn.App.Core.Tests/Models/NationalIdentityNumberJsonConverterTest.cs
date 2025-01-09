using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Models;

public class NationalIdentityNumberJsonConverterTest
{
    public record TestObject
    {
        [JsonConverter(typeof(NationalIdentityNumberJsonConverter))]
        public NationalIdentityNumber Value { get; init; }
    }

    [Theory]
    [InlineData("13896396174", "13896396174")]
    [InlineData($"{AltinnUrns.PersonId}:13896396174", "13896396174")]
    public void JsonDeserialisesCorrectly(string incomingJsonData, string expectedParsedNumber)
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
        result.Value.Should().Be(expectedParsedNumber);
    }

    [Theory]
    [InlineData("13896396174", "13896396174")]
    public void JsonSerialisesCorrectly(string originalValue, string expectedJsonResult)
    {
        // Arrange
        var data = new TestObject { Value = NationalIdentityNumber.Parse(originalValue) };

        // Act
        var result = JsonSerializer.Serialize(data);

        // Assert
        Assert.NotNull(result);
        result.Should().MatchRegex($"\"Value\":*.\"{expectedJsonResult}\"");
    }
}
