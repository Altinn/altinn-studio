using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models;

public class AltinnOrgContext
{
    public string Org { get; }
    public string DeveloperName { get; }

    private AltinnOrgContext(string org, string developerName)
    {
        Guard.AssertValidateOrganization(org);
        Org = org;

        Guard.AssertArgumentNotNullOrWhiteSpace(developerName, nameof(developerName));
        DeveloperName = developerName;
    }

    public static AltinnOrgContext FromOrg(string org, string developerName)
    {
        return new AltinnOrgContext(org, developerName);
    }
}
