using Xunit;

namespace LocalTest.Tests.Authorization;

/// <summary>
/// The PDP adds the access packages the subject holds for the resource party, as production does, so a policy rule on
/// <c>urn:altinn:accesspackage</c> decides the same way locally as in the cloud.
/// </summary>
public sealed class AccessPackageDecisionTests
{
    [Fact]
    public async Task User_HoldsThePackageForTheParty_IsPermitted()
    {
        using var harness = new AccessPackageHarness();

        // Given as a URN in upper case, and second of the user's packages for the party
        Assert.Equal("Permit", await harness.DecideForUser(1001, 500000));
    }

    [Fact]
    public async Task User_HoldsOtherPackagesForTheParty_IsNotApplicable()
    {
        using var harness = new AccessPackageHarness(requiredPackage: "skattegrunnlag");

        Assert.Equal("NotApplicable", await harness.DecideForUser(1001, 500000));
    }

    [Fact]
    public async Task User_HoldsThePackageForTheMainUnit_IsPermittedForTheSubUnit()
    {
        using var harness = new AccessPackageHarness();

        Assert.Equal("Permit", await harness.DecideForUser(1001, 500001));
    }

    [Fact]
    public async Task User_HoldsThePackageForAnotherParty_IsNotApplicable()
    {
        using var harness = new AccessPackageHarness();

        Assert.Equal("NotApplicable", await harness.DecideForUser(1001, 500002));
    }

    [Fact]
    public async Task User_PackageOnTheOwnParty_IsNoGrantForOtherParties()
    {
        using var harness = new AccessPackageHarness(requiredPackage: "skattegrunnlag");

        Assert.Equal("Permit", await harness.DecideForUser(1001, 510001));
        Assert.Equal("NotApplicable", await harness.DecideForUser(1001, 500002));
    }

    [Fact]
    public async Task SystemUser_HoldsThePackage_IsPermittedForItsOrganizationAndSubUnits()
    {
        using var harness = new AccessPackageHarness();

        Assert.Equal("Permit", await harness.DecideForSystemUser(AccessPackageHarness.SystemUserWithPackage, 500000));
        Assert.Equal("Permit", await harness.DecideForSystemUser(AccessPackageHarness.SystemUserWithPackage, 500001));
    }

    [Fact]
    public async Task SystemUser_ForAnotherOrganization_IsNotApplicable()
    {
        using var harness = new AccessPackageHarness();

        Assert.Equal(
            "NotApplicable",
            await harness.DecideForSystemUser(AccessPackageHarness.SystemUserWithPackage, 500002)
        );
    }

    [Fact]
    public async Task SystemUser_WithoutThePackage_IsNotApplicable()
    {
        using var harness = new AccessPackageHarness();

        Assert.Equal(
            "NotApplicable",
            await harness.DecideForSystemUser(AccessPackageHarness.SystemUserWithoutPackage, 500000)
        );
    }

    [Fact]
    public async Task Roles_GiveThePackagesAccessManagementDerives()
    {
        using var harness = new AccessPackageHarness();

        // Gjentagende Forelder is daglig leder of DDG Fitness, which gives lonn in Access Management

        Assert.Equal("Permit", await harness.DecideForUser(1002, 500000));
        Assert.Equal("Permit", await harness.DecideForUser(1002, 500001));
        Assert.Equal("NotApplicable", await harness.DecideForUser(1002, 500002));
        Assert.Contains("tilgangsstyrer", await harness.AccessPackages.GetAccessPackagesForUser(1002, 500000));
    }

    [Fact]
    public async Task Roles_GivePackagesForAUnitTypeOnlyToThatUnitType()
    {
        using var harness = new AccessPackageHarness();

        // Forretningsfører (FFØR) gives packages only for securities funds (VPFO)
        Assert.Equal("Permit", await harness.DecideForUser(1002, 500100));
        Assert.Equal("NotApplicable", await harness.DecideForUser(1002, 500200));
        Assert.Empty(await harness.AccessPackages.GetAccessPackagesForUser(1002, 500200));
    }

    [Fact]
    public async Task AuthorizedParties_ListThePackagesAndRolesPerParty()
    {
        using var harness = new AccessPackageHarness();

        var parties = await harness.AuthorizedParties(1001);

        Assert.Equal([510001, 500000], parties.Select(p => p.PartyId));
        var own = parties[0];
        // The test data's own package first, then those privatperson (PRIV) gives
        Assert.Equal("skattegrunnlag", own.AuthorizedAccessPackages[0]);
        Assert.Contains("innbygger-arbeidsliv", own.AuthorizedAccessPackages);
        Assert.Equal(["priv"], own.AuthorizedRoles);
        var org = parties[1];
        Assert.Equal(["regnskapsforer-lonn", "lonn"], org.AuthorizedAccessPackages);
        Assert.Empty(org.AuthorizedRoles);
        var subUnit = Assert.Single(org.Subunits);
        Assert.Equal(500001, subUnit.PartyId);
        Assert.Equal(["regnskapsforer-lonn", "lonn"], subUnit.AuthorizedAccessPackages);
    }

    [Fact]
    public async Task AuthorizedParties_SubUnitsInheritRoles()
    {
        using var harness = new AccessPackageHarness();

        var parties = await harness.AuthorizedParties(1002);

        var org = parties.Single(p => p.PartyId == 500000);
        Assert.Equal(["DAGL"], org.AuthorizedRoles);
        Assert.Equal(["DAGL"], Assert.Single(org.Subunits).AuthorizedRoles);
    }

    [Fact]
    public async Task AuthorizedParties_ListThePackagesDerivedFromRoles()
    {
        using var harness = new AccessPackageHarness();

        var parties = await harness.AuthorizedParties(1002);

        var org = parties.Single(p => p.PartyId == 500000);
        Assert.Contains("lonn", org.AuthorizedAccessPackages);
        Assert.Contains("lonn", Assert.Single(org.Subunits).AuthorizedAccessPackages);
    }
}
