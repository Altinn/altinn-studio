using System;

namespace Altinn.Studio.Designer.Helpers;

public static class OrgUtil
{
    private const string TestOrg = "ttd";

    /// <summary>
    /// The org that ttd apps authenticate as. ttd has no organization number, so the app runtime and the operator
    /// use Digdir's, and the platform then issues their service-owner tokens with digdir as the org.
    /// See EnvironmentsService.GetAltinnOrgNumber for the full picture.
    /// </summary>
    private const string TestOrgAuthenticatedAs = "digdir";

    public static bool IsTestEnv(string org)
    {
        return string.Equals(org, TestOrg, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Returns the org that service-owner tokens for apps owned by <paramref name="org"/> carry in their
    /// urn:altinn:org claim. This is the org itself, except for ttd apps, which authenticate as digdir.
    /// </summary>
    public static string AuthenticatedOrg(string org)
    {
        return IsTestEnv(org) ? TestOrgAuthenticatedAs : org;
    }
}
