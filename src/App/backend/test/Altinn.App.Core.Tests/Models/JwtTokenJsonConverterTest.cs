using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Models;

public class JwtTokenJsonConverterTest
{
    private const string TokenString =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    private static readonly JwtToken _token = JwtToken.Parse(TokenString);

    public record TestObject
    {
        [JsonConverter(typeof(JwtTokenJsonConverter))]
        public JwtToken Value { get; init; }
    }

    [Fact]
    public void JsonDeserialisesCorrectly()
    {
        // Arrange
        var json = $$"""
            {
                "Value": "{{TokenString}}"
            }
            """;

        // Act
        var result = JsonSerializer.Deserialize<TestObject>(json);

        // Assert
        Assert.NotNull(result);
        result.Value.Should().Be(_token);
    }

    [Fact]
    public void JsonSerialisesCorrectly()
    {
        // Arrange
        var data = new TestObject { Value = _token };

        // Act
        var result = JsonSerializer.Serialize(data);

        // Assert
        Assert.NotNull(result);
        result.Should().MatchRegex($"\"Value\":*.\"{TokenString}\"");
    }
}
