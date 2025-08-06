using System.Text.Json;
using Altinn.Studio.Designer.Converters;
using Altinn.Studio.Designer.Models;
using Xunit;

public class LocalizedStringConverterTests
{
    private readonly JsonSerializerOptions _options;

    public LocalizedStringConverterTests()
    {
        _options = new JsonSerializerOptions
        {
            Converters = { new LocalizedStringConverter() },
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };
    }

    [Fact]
    public void Read_FromString_ShouldReturnLocalizedStringWithNb()
    {
        var json = "\"Min tjeneste\"";

        var result = JsonSerializer.Deserialize<LocalizedString>(json, _options);

        Assert.NotNull(result);
        Assert.Equal("Min tjeneste", result.Nb);
        Assert.Equal("", result.Nn);
        Assert.Equal("", result.En);
    }

    [Fact]
    public void Read_FromObject_ShouldReturnLocalizedStringCorrectly()
    {
        var json = "{\"nb\":\"Hei\",\"nn\":\"Hallo\",\"en\":\"Hello\"}";

        var result = JsonSerializer.Deserialize<LocalizedString>(json, _options);

        Assert.NotNull(result);
        Assert.Equal("Hei", result.Nb);
        Assert.Equal("Hallo", result.Nn);
        Assert.Equal("Hello", result.En);
    }

    [Fact]
    public void Write_ShouldSerializeToExpectedJson()
    {
        var input = new LocalizedString
        {
            Nb = "Tjeneste",
            Nn = "Teneste",
            En = "Service"
        };

        var json = JsonSerializer.Serialize(input, _options);

        const string ExpectedJson = "{\"nb\":\"Tjeneste\",\"nn\":\"Teneste\",\"en\":\"Service\"}";
        Assert.Equal(ExpectedJson, json);
    }
}
