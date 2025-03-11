using System.Globalization;
using Altinn.App.Api.Helpers;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Features.Auth;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;

namespace Altinn.App.Api.Tests.Helpers;

public class DataElementAccessCheckerTests
{
    [Theory]
    [InlineData(null, null, null, false, true)] // No allowed contributors, should be true
    [InlineData("org:altinn", "altinn", 370194483, false, true)] // Matching org
    [InlineData("org:altinn", "Altinn", 370194483, false, true)] // Matching org, case insensitive
    [InlineData("org:altinn", "notAltinn", 370194483, false, false)] // Non-matching org
    [InlineData("orgno:370194483", "altinn", 370194483, false, true)] // Matching orgNr
    [InlineData("orgno:370194483", "altinn", 556750777, false, false)] // Non-matching orgNr
    [InlineData("orgno:370194483", null, 370194483, false, true)] // Matching orgNr (not serviceowner)
    [InlineData("orgno:370194483", null, 556750777, false, false)] // Non-matching orgNr (not serviceowner)
    [InlineData("orgno:370194483", null, null, false, false)] // orgNr is null
    [InlineData("org:altinn,orgno:370194483", "altinn", 370194483, false, true)] // Matching both
    [InlineData("org:altinn,orgno:370194483", "altinn", 556750777, false, true)] // Matching org only
    [InlineData("org:altinn,orgno:370194483", "notAltinn", 370194483, false, true)] // Matching orgNr only
    [InlineData("org:altinn,orgno:370194483", "notAltinn", 556750777, false, false)] // Non-matching both
    [InlineData("org:altinn,orgno:556750777", null, 556750777, true, true)] // Matching second rule
    [InlineData("org:altinn,orgno:556750777", null, 556750777, false, true)] // Matching second rule
    [InlineData("orgno:370194483", null, 370194483, true, true)] // Matching orgNr (as systemuser)
    [InlineData("orgno:370194483", null, 556750777, true, false)] // Non-matching orgNr (as systemuser)
    [InlineData("org:altinn", null, 370194483, true, false)] // Org (as systemuser)
    public void IsValidContributor_ShouldReturnExpectedResult(
        string? allowedContributors,
        string? org,
        int? orgNr,
        bool isSystemUser,
        bool expectedResult
    )
    {
        // Arrange
        var dataType = new DataType
        {
            AllowedContributers = allowedContributors?.Split(',')?.ToList() ?? new List<string>(),
        };
        Authenticated auth = (org, orgNr, isSystemUser) switch
        {
            (null, null, _) => TestAuthentication.GetNoneAuthentication(),
            (string orgName, int orgNo, _) => TestAuthentication.GetServiceOwnerAuthentication(
                orgNumber: orgNo.ToString(CultureInfo.InvariantCulture),
                org: orgName
            ),
            (null, int orgNumber, bool systemUser) when !systemUser => TestAuthentication.GetOrgAuthentication(
                orgNumber.ToString(CultureInfo.InvariantCulture)
            ),
            (null, int orgNumber, bool systemUser) when systemUser => TestAuthentication.GetSystemUserAuthentication(
                systemUserOrgNumber: orgNumber.ToString(CultureInfo.InvariantCulture)
            ),
            _ => throw new Exception("Unhandled case"),
        };

        // Act
        bool result = DataElementAccessChecker.IsValidContributor(dataType, auth);

        // Assert
        result.Should().Be(expectedResult);
    }
}
