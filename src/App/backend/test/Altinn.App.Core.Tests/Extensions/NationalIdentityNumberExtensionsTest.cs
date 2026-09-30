using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Tests.Extensions;

public class NationalIdentityNumberExtensionsTest
{
    [Fact]
    public void ToUrnFormattedString_WithValidIdentityNumber_ReturnsCorrectUrn()
    {
        // Arrange
        var identityNumber = IdentificationNumberProvider.NationalIdentityNumbers.GetValidNumber(1);

        // Act
        var result = identityNumber.ToUrnFormattedString();

        // Assert
        Assert.Equal($"{AltinnUrns.PersonId}:{identityNumber}", result);
    }

    [Fact]
    public void ToUrnFormattedString_WithNullIdentityNumber_ReturnsNull()
    {
        // Arrange
        NationalIdentityNumber? identityNumber = null;

        // Act
        var result = identityNumber.ToUrnFormattedString();

        // Assert
        Assert.Null(result);
    }

    [Theory]
    [InlineData("12345678901", "123456*****")] // ordinary 11-digit number
    [InlineData("1234567", "123456*")] // one extra char masked
    [InlineData("123456", "******")] // exactly the visible length -> fully masked
    [InlineData("123", "***")] // shorter than visible length -> fully masked
    [InlineData("", "")] // empty returned as-is
    [InlineData(null, null)] // null returned as-is
    public void Mask_KeepsBirthDateVisible_MasksTheRest(string? input, string? expected)
    {
        Assert.Equal(expected, NationalIdentityNumberExtensions.Mask(input));
    }

    [Fact]
    public void Mask_DoesNotValidate_SoAMalformedNumberIsStillMasked()
    {
        // "12345678901" fails the Mod11 checksum, but masking must not leak it.
        Assert.False(NationalIdentityNumber.TryParse("12345678901", out _));
        Assert.Equal("123456*****", NationalIdentityNumberExtensions.Mask("12345678901"));
    }

    [Fact]
    public void ToMaskedString_MasksAValidIdentityNumber()
    {
        // Arrange
        var identityNumber = IdentificationNumberProvider.NationalIdentityNumbers.GetValidNumber(1);

        // Act
        var result = identityNumber.ToMaskedString();

        // Assert
        Assert.Equal($"{identityNumber.Value.Substring(0, 6)}*****", result);
    }
}
