using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Tests.Extensions;

public class OrganizationNumberExtensionsTest
{
    [Fact]
    public void ToUrnFormattedString_WithValidOrganizationNumber_ReturnsCorrectUrn()
    {
        // Arrange
        var organizationNumber = IdentificationNumberProvider.OrganizationNumbers.GetValidNumber(1);

        // Act
        var result = organizationNumber.ToUrnFormattedString();

        // Assert
        Assert.Equal($"{AltinnUrns.OrganizationNumber}:{organizationNumber}", result);
    }

    [Fact]
    public void ToUrnFormattedString_WithNullOrganizationNumber_ReturnsNull()
    {
        // Arrange
        OrganizationNumber? organizationNumber = null;

        // Act
        var result = organizationNumber.ToUrnFormattedString();

        // Assert
        Assert.Null(result);
    }
}
