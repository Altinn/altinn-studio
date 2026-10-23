namespace LocalTest.Helpers.Authorization;

/// <summary>
/// ttd, the test service owner, has no organization number, so its apps authenticate as Digdir: the platform issues
/// their service-owner tokens with digdir as urn:altinn:org, and Studio deploys their policies with digdir as the
/// service-owner subject. LocalTest mirrors both so a ttd app behaves the same locally as in the cloud.
/// </summary>
public static class ServiceOwnerOrg
{
    private const string TestOrg = "ttd";
    private const string TestOrgAuthenticatedAs = "digdir";

    /// <summary>
    /// Returns the org that service-owner tokens for apps owned by <paramref name="org"/> carry in their
    /// urn:altinn:org claim. This is the org itself, except for ttd apps, which authenticate as digdir.
    /// </summary>
    public static string AuthenticatedOrg(string org)
    {
        return string.Equals(org, TestOrg, StringComparison.OrdinalIgnoreCase) ? TestOrgAuthenticatedAs : org;
    }
}
