using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;

namespace Altinn.App.Clients.Fiks.Tests.Extensions;

public class StringExtensionsTests
{
    [Fact]
    public void DeserializeXml_ValidXml_ReturnsObject()
    {
        // Arrange
        const string xml = """
            <?xml version="1.0" encoding="utf-8"?>
            <arkivmelding xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/arkivmelding/opprett/v1">
              <system>record-system-id</system>
              <regel>record-rule-id</regel>
              <antallFiler>2</antallFiler>
            </arkivmelding>
            """;
        var expected = new Arkivmelding
        {
            System = "record-system-id",
            Regel = "record-rule-id",
            AntallFiler = 2,
        };

        // Act
        var result = xml.DeserializeXml<Arkivmelding>();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(result.System, expected.System);
        Assert.Equal(result.Regel, expected.Regel);
        Assert.Equal(result.AntallFiler, expected.AntallFiler);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public void DeserializeXml_NullOrEmptyInput_ReturnsNull(string? input)
    {
        var result = input!.DeserializeXml<Arkivmelding>();
        Assert.Null(result);
    }

    [Fact]
    public void DeserializeXml_InvalidXml_ThrowsException()
    {
        // Arrange
        const string xml = "This isn't XML";

        // Act
        var ex = Record.Exception(() => xml.DeserializeXml<Arkivmelding>());

        // Assert
        Assert.IsType<InvalidOperationException>(ex);
    }

    [Theory]
    [InlineData("<<???>>", "PDw_Pz8-Pg")]
    [InlineData(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        "TG9yZW0gaXBzdW0gZG9sb3Igc2l0IGFtZXQsIGNvbnNlY3RldHVyIGFkaXBpc2NpbmcgZWxpdC4"
    )]
    [InlineData(
        "http://local.altinn.cloud/ttd/the-app/instances/12345/c9119159-f849-4723-a1cb-fbaead83ab11",
        "aHR0cDovL2xvY2FsLmFsdGlubi5jbG91ZC90dGQvdGhlLWFwcC9pbnN0YW5jZXMvMTIzNDUvYzkxMTkxNTktZjg0OS00NzIzLWExY2ItZmJhZWFkODNhYjEx"
    )]
    public void ToAndFromUrlSafeBase64_ValidString_ConvertsValueCorrectly(string plainTextValue, string base64Value)
    {
        // Act
        var base64Result = plainTextValue.ToUrlSafeBase64();
        var plainTextResult = base64Value.FromUrlSafeBase64();

        Assert.Equal(plainTextValue, plainTextResult);
        Assert.Equal(base64Value, base64Result);
    }

    [Fact]
    public void ToUrlSafeBase64_NullString_ThrowsArgumentNullException()
    {
        string plainText = null!;
        Assert.Throws<ArgumentNullException>(() => plainText.ToUrlSafeBase64());
    }

    [Fact]
    public void FromUrlSafeBase64_NullString_ThrowsArgumentNullException()
    {
        string base64Encoded = null!;
        Assert.Throws<ArgumentNullException>(() => base64Encoded.FromUrlSafeBase64());
    }

    [Fact]
    public void FromUrlSafeBase64_InvalidBase64_ThrowsFormatException()
    {
        var base64Encoded = "InvalidBase64";
        Assert.Throws<FormatException>(() => base64Encoded.FromUrlSafeBase64());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void EnsureNotNullOrEmpty_ThrowsException_WhenInputIsNullOrEmpty(string? input)
    {
        Assert.Throws<FiksArkivException>(() => input.EnsureNotNullOrEmpty("paramName"));
    }

    [Theory]
    [InlineData(" ")]
    [InlineData("abcdef")]
    public void EnsureNotNullOrEmpty_ReturnsInput_WhenInputIsValid(string input)
    {
        string result = input.EnsureNotNullOrEmpty("paramName");
        Assert.Equal(input, result);
    }

    [Fact]
    public void EnsureNotEmpty_ThrowsException_WhenInputIsEmpty()
    {
        string input = string.Empty;
        Assert.Throws<FiksArkivException>(() => input.EnsureNotEmpty("paramName"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("abcdef")]
    public void EnsureNotEmpty_ReturnsInput_WhenInputIsNullOrValid(string? input)
    {
        string? result = input.EnsureNotEmpty("paramName");
        Assert.Equal(input, result);
    }
}
