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
}
