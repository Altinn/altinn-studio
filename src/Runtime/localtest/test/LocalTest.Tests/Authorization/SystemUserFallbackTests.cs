using Xunit;

namespace LocalTest.Tests.Authorization;

/// <summary>
/// When the app policy does not apply to a system user, Localtest permits the actions the test data gives the system
/// user, so apps whose policies have no system user rules can still be tested with one.
/// </summary>
public sealed class SystemUserFallbackTests
{
    [Fact]
    public async Task NoActions_GrantNothing()
    {
        using var harness = new AccessPackageHarness(requiredPackage: "not-held");

        Assert.Equal("NotApplicable", await harness.DecideForSystemUser(AccessPackageHarness.SystemUserWithoutActions, 500000));
    }

    [Fact]
    public async Task OneAction_IsPermitted()
    {
        using var harness = new AccessPackageHarness(requiredPackage: "not-held");

        Assert.Equal("Permit", await harness.DecideForSystemUser(AccessPackageHarness.SystemUserWithRead, 500000));
    }

    [Fact]
    public async Task SeveralActions_PermitEachOfThemAndNoOther()
    {
        using var harness = new AccessPackageHarness(requiredPackage: "not-held");

        Assert.Equal("Permit", await harness.DecideForSystemUser(AccessPackageHarness.SystemUserWithReadAndWrite, 500000, "read"));
        Assert.Equal("Permit", await harness.DecideForSystemUser(AccessPackageHarness.SystemUserWithReadAndWrite, 500000, "write"));
        Assert.Equal("NotApplicable", await harness.DecideForSystemUser(AccessPackageHarness.SystemUserWithReadAndWrite, 500000, "delete"));
    }

    // The fallback does not check the resource party, so a system user is permitted for any organization
    [Fact]
    public async Task AnotherOrganization_IsPermitted()
    {
        using var harness = new AccessPackageHarness(requiredPackage: "not-held");

        Assert.Equal("Permit", await harness.DecideForSystemUser(AccessPackageHarness.SystemUserWithRead, 500002));
    }
}
