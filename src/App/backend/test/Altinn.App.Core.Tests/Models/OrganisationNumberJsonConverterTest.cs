using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Models;

public class OrganizationNumberJsonConverterTest
{
    public record TestObjectLocal
    {
        [OrganizationNumberJsonConverter(OrganizationNumberFormat.Local)]
        public OrganizationNumber Value { get; init; }
    }

    public record TestObjectInternational
    {
        [OrganizationNumberJsonConverter(OrganizationNumberFormat.International)]
        public OrganizationNumber Value { get; init; }
    }

    [Theory]
    [InlineData("474103390", "474103390")]
    [InlineData("0192:474103390", "474103390")]
    [InlineData($"{AltinnUrns.OrganizationNumber}:474103390", "474103390")]
    public void JsonDeserialisesCorrectly(string incomingJsonData, string expectedParsedNumber)
    {
        // Arrange
        var json = $$"""
            {
                "Value": "{{incomingJsonData}}"
            }
            """;

        // Act
        var result1 = JsonSerializer.Deserialize<TestObjectLocal>(json);
        var result2 = JsonSerializer.Deserialize<TestObjectInternational>(json);

        // Assert
        Assert.NotNull(result1);
        Assert.NotNull(result2);

        result1.Value.Should().Be(expectedParsedNumber);
        result2.Value.Should().Be(expectedParsedNumber);
    }

    [Theory]
    [InlineData("474103390", "474103390", "0192:474103390")]
    [InlineData("0192:474103390", "474103390", "0192:474103390")]
    public void JsonSerialisesCorrectly(
        string originalValue,
        string expectedLocalJsonResult,
        string expectedInternationalJsonResult
    )
    {
        // Arrange
        var dataLocal = new TestObjectLocal { Value = OrganizationNumber.Parse(originalValue) };
        var dataInternational = new TestObjectInternational { Value = OrganizationNumber.Parse(originalValue) };

        // Act
        var result1 = JsonSerializer.Serialize(dataLocal);
        var result2 = JsonSerializer.Serialize(dataInternational);

        // Assert
        Assert.NotNull(result1);
        Assert.NotNull(result2);

        result1.Should().MatchRegex($"\"Value\":*.\"{expectedLocalJsonResult}\"");
        result2.Should().MatchRegex($"\"Value\":*.\"{expectedInternationalJsonResult}\"");
    }
}
