using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models;

public class AltinnOrgEditingContext
{
    public string Org { get; }
    public string DeveloperName { get; }

    private AltinnOrgEditingContext(string org, string developerName)
    {
        Guard.AssertValidateOrganization(org);
        Org = org;

        Guard.AssertArgumentNotNullOrWhiteSpace(developerName, nameof(developerName));
        DeveloperName = developerName;
    }

    public static AltinnOrgEditingContext FromOrgDeveloper(string org, string developerName)
    {
        return new AltinnOrgEditingContext(org, developerName);
    }
}
