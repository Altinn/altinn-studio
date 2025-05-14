using System.Globalization;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Helpers;

public class AllowedContributorsHelperTests
{
    [Theory]
    [InlineData(null, null, null, true)] // No allowed contributors, should be true
    [InlineData("org:altinn", "altinn", 370194483, true)] // Matching service owner
    [InlineData("org:altinn", "Altinn", 370194483, true)] // Matching service owner, case insensitive
    [InlineData("org:altinn", null, null, false)] // No match
    [InlineData("org:altinn", "notAltinn", 370194483, false)] // Different service owner
    [InlineData("orgno:370194483", "altinn", 370194483, true)] // Matching service owner orgNr
    [InlineData("orgno:370194483", "altinn", 556750777, false)] // Non-matching service owner orgNr
    [InlineData("orgno:370194483", null, 370194483, false)] // Matching orgNr (not serviceowner)
    [InlineData("orgno:370194483", null, 556750777, false)] // Non-matching orgNr (not serviceowner)
    [InlineData("orgno:370194483", null, null, false)] // No match
    [InlineData("org:altinn,orgno:370194483", "altinn", 370194483, true)] // Matches service owner name
    [InlineData("org:altinn,orgno:370194483", "altinn", 556750777, true)] // Matches service owner name (different org nr, will not actually happen)
    [InlineData("org:altinn,orgno:370194483", "notAltinn", 370194483, true)] // Different service owner name, but matching service owner org nr (should not actually happen)
    [InlineData("org:altinn,orgno:370194483", "notAltinn", 556750777, false)] // Different service owner
    [InlineData("org:altinn,orgno:556750777", null, 556750777, false)] // Matching orgNr (not serviceowner)
    [InlineData("app:owned", null, null, false)] // App owned, no matching
    [InlineData("app:owned", "org:altinn", 370194483, false)] // App owned, matching both
    [InlineData("app:owned", null, 370194483, false)] // App owned, matching orgNr
    public void IsValidContributor_ShouldReturnExpectedResult(
        string? allowedContributors,
        string? org,
        int? orgNr,
        bool expectedResult
    )
    {
        // Arrange
        var dataType = new DataType
        {
            AllowedContributers = allowedContributors?.Split(',')?.ToList() ?? new List<string>(),
        };
        Authenticated auth = (org, orgNr) switch
        {
            (null, null) => TestAuthentication.GetNoneAuthentication(),
            (null, int orgNo) => TestAuthentication.GetOrgAuthentication(
                orgNumber: orgNo.ToString(CultureInfo.InvariantCulture)
            ),
            (string orgName, int orgNo) => TestAuthentication.GetServiceOwnerAuthentication(
                orgNumber: orgNo.ToString(CultureInfo.InvariantCulture),
                org: orgName
            ),
            _ => throw new Exception("Unhandled case"),
        };

        // Act
        bool result = AllowedContributorsHelper.IsValidContributor(dataType, auth);

        // Assert
        result.Should().Be(expectedResult);
    }
}
