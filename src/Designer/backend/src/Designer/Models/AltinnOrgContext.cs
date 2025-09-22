using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Class representing context of an Altinn organization.
/// This class in part of internal domain model and should not be exposed to the outside world.
/// </summary>
public class AltinnOrgContext
{
    /// <summary>
    ///  The organization owning the repository identfied by it's short name.
    /// </summary>
    public string Org { get; }
    protected AltinnOrgContext(string org)
    {
        Guard.AssertValidateOrganization(org);
        Org = org;
    }

    public static AltinnOrgContext FromOrg(string org)
    {
        return new AltinnOrgContext(org);
    }
}
