using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// A class representing an Altinn environment.
/// </summary>
public record AltinnEnvironment
{
    public string Name { get; }

    private AltinnEnvironment(string name)
    {
        Guard.AssertValidEnvironmentName(name);
        Name = name.Equals("production", System.StringComparison.OrdinalIgnoreCase) ? "prod" : name;
    }

    public static AltinnEnvironment FromName(string name)
    {
        return new AltinnEnvironment(name);
    }

    public static AltinnEnvironment Prod => new("prod");
}
