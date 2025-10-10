using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models;

public record AltinnOrgEditingContext : AltinnOrgContext
{
    public string Developer { get; }

    private AltinnOrgEditingContext(string org, string developer) : base(org)
    {
        Guard.AssertArgumentNotNullOrWhiteSpace(developer, nameof(developer));
        Developer = developer;
    }

    public static AltinnOrgEditingContext FromOrgDeveloper(string org, string developerName)
    {
        return new AltinnOrgEditingContext(org, developerName);
    }
}
