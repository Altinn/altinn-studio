using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Services.Implementation;

public record AltinnRepoName
{
    public string Name { get; }

    private AltinnRepoName(string name)
    {
        Guard.AssertValidAppRepoName(name);
        Name = name;
    }

    public static AltinnRepoName FromName(string name)
    {
        return new AltinnRepoName(name);
    }
}
