using System.Text.Json;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Resilience.Tests.JsonConverters;

public class FlexibleEnumConverterTests
{
    private static readonly JsonSerializerOptions _options = new();

    [Theory]
    [InlineData("\"Constant\"", BackoffType.Constant)]
    [InlineData("\"Linear\"", BackoffType.Linear)]
    [InlineData("\"Exponential\"", BackoffType.Exponential)]
    [InlineData("\"constant\"", BackoffType.Constant)]
    [InlineData("\"EXPONENTIAL\"", BackoffType.Exponential)]
    public void Read_StringValue_ParsesCorrectly(string json, BackoffType expected)
    {
        // Act
        var result = JsonSerializer.Deserialize<BackoffType>(json, _options);

        // Assert
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(0, BackoffType.Constant)]
    [InlineData(1, BackoffType.Linear)]
    [InlineData(2, BackoffType.Exponential)]
    public void Read_NumericValue_ParsesCorrectly(int value, BackoffType expected)
    {
        // Arrange
        var json = value.ToString(System.Globalization.CultureInfo.InvariantCulture);

        // Act
        var result = JsonSerializer.Deserialize<BackoffType>(json, _options);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Read_InvalidString_ThrowsJsonException()
    {
        // Arrange
        const string json = "\"NotAValidValue\"";

        // Act & Assert
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<BackoffType>(json, _options));
    }

    [Fact]
    public void Read_InvalidNumeric_ThrowsJsonException()
    {
        // Arrange
        const string json = "999";

        // Act & Assert
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<BackoffType>(json, _options));
    }

    [Fact]
    public void Read_NullString_ThrowsJsonException()
    {
        // Arrange
        const string json = "\"\"";

        // Act & Assert
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<BackoffType>(json, _options));
    }

    [Fact]
    public void Write_OutputsStringRepresentation()
    {
        // Arrange
        const BackoffType value = BackoffType.Exponential;

        // Act
        var json = JsonSerializer.Serialize(value, _options);

        // Assert
        Assert.Equal("\"Exponential\"", json);
    }
}
