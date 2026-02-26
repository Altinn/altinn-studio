using System;
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
        Name = name;
    }

    public static AltinnEnvironment FromName(string name)
    {
        return new AltinnEnvironment(name);
    }

    public bool IsProd()
    {
        return Name.Equals("prod", StringComparison.OrdinalIgnoreCase);
    }
}
