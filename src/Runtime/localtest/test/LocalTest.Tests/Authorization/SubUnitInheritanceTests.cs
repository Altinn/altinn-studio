using Xunit;

namespace LocalTest.Tests.Authorization;

/// <summary>
/// A sub-unit inherits the roles and access packages held for its main unit, as Access Management's hierarchy gives them:
/// role packages by the sub-unit's own unit type, and nothing for a sub-unit of unit type ADOS.
/// </summary>
public sealed class SubUnitInheritanceTests
{
    private const string TestData = """
        {
          "persons": [
            {
              "partyId": 510001, "ssn": "01017000001", "lastName": "Leder", "userId": 1,
              "partyRoles": {
                "500000": [{ "type": "altinn", "value": "DAGL" }],
                "500100": [{ "type": "altinn", "value": "ffør" }]
              }
            }
          ],
          "orgs": [
            { "partyId": 500000, "orgNumber": "910000000", "name": "Hovedenhet AS", "unitType": "AS" },
            { "partyId": 500001, "orgNumber": "910000001", "name": "Avdeling", "unitType": "BEDR", "parentPartyId": 500000 },
            { "partyId": 500002, "orgNumber": "910000002", "name": "Forvaltning", "unitType": "ADOS", "parentPartyId": 500000 },
            { "partyId": 500100, "orgNumber": "910000100", "name": "Fondet", "unitType": "VPFO" },
            { "partyId": 500101, "orgNumber": "910000101", "name": "Fondets avdeling", "unitType": "BEDR", "parentPartyId": 500100 }
          ],
          "systems": [
            {
              "id": "910000000_sbs",
              "name": "Sluttbrukersystem",
              "systemUsers": [{ "id": "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0101", "orgNumber": "910000000", "accessPackages": ["lonn"] }]
            }
          ]
        }
        """;

    private const string SystemUser = "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0101";

    [Fact]
    public async Task SubUnit_InheritsTheRolesHeldForTheMainUnit()
    {
        using var harness = new AccessPackageHarness(testData: TestData);

        Assert.Equal(["DAGL"], (await harness.Roles.GetDecisionPointRolesForUser(1, 500001)).Select(r => r.Value));
    }

    [Fact]
    public async Task SubUnit_InheritsThePackagesOfTheMainUnitsRoles()
    {
        using var harness = new AccessPackageHarness(testData: TestData);

        Assert.Equal("Permit", await harness.DecideForUser(1, 500001));
        Assert.Contains("lonn", await harness.AccessPackages.GetAccessPackagesForUser(1, 500001));
    }

    [Fact]
    public async Task SubUnit_GetsRolePackagesByItsOwnUnitType()
    {
        using var harness = new AccessPackageHarness(testData: TestData);

        // Forretningsfører (FFØR) gives packages for the securities fund (VPFO), not for its BEDR sub-unit
        Assert.NotEmpty(await harness.AccessPackages.GetAccessPackagesForUser(1, 500100));
        Assert.Equal(["FFØR"], (await harness.Roles.GetDecisionPointRolesForUser(1, 500101)).Select(r => r.Value.ToUpperInvariant()));
        Assert.Empty(await harness.AccessPackages.GetAccessPackagesForUser(1, 500101));
    }

    [Fact]
    public async Task AdministrativeUnitInThePublicSector_InheritsNothing()
    {
        using var harness = new AccessPackageHarness(testData: TestData);

        Assert.Empty(await harness.Roles.GetDecisionPointRolesForUser(1, 500002));
        Assert.Empty(await harness.AccessPackages.GetAccessPackagesForUser(1, 500002));
        Assert.Equal("NotApplicable", await harness.DecideForUser(1, 500002));
        Assert.Equal("Permit", await harness.DecideForSystemUser(SystemUser, 500001));
        Assert.Equal("NotApplicable", await harness.DecideForSystemUser(SystemUser, 500002));
    }

    [Fact]
    public async Task AuthorizedParties_ListTheInheritedRolesAsTheDecisionsUseThem()
    {
        using var harness = new AccessPackageHarness(testData: TestData);

        var org = (await harness.AuthorizedParties(1)).Single(p => p.PartyId == 500000);

        var subunits = org.Subunits.ToDictionary(s => s.PartyId);
        Assert.Equal(["DAGL"], subunits[500001].AuthorizedRoles);
        Assert.Contains("lonn", subunits[500001].AuthorizedAccessPackages);
        Assert.Empty(subunits[500002].AuthorizedRoles);
        Assert.Empty(subunits[500002].AuthorizedAccessPackages);
    }
}
