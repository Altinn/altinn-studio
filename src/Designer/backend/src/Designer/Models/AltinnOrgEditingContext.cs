using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models;

public record AltinnOrgEditingContext : AltinnOrgContext
{
    public string DeveloperName { get; }

    private AltinnOrgEditingContext(string org, string developerName): base(org)
    {
        Guard.AssertArgumentNotNullOrWhiteSpace(developerName, nameof(developerName));
        DeveloperName = developerName;
    }

    public static AltinnOrgEditingContext FromOrgDeveloper(string org, string developerName)
    {
        return new AltinnOrgEditingContext(org, developerName);
    }
}
