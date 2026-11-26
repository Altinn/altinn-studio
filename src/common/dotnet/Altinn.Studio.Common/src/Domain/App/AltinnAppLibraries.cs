using System;
using System.Collections.Generic;

namespace Altinn.Studio.Common.Domain.App;

/// <summary>
/// The Altinn.App libraries that form apps are built on, as the packages that publish a version of them and the
/// assemblies those packages carry. The packages of a version are published together, at the same version.
/// </summary>
/// <remarks>
/// <see cref="AltinnAppPackage"/> is the package an app's project references, which says the major version the app
/// is on. This type is about what a version of the libraries is made of.
/// </remarks>
public static class AltinnAppLibraries
{
    /// <summary>
    /// The packages whose assemblies make up a version's public API, <c>Altinn.App.Api</c> first, which every version
    /// has. An older version has only those that existed then: before v7 there was no <c>Altinn.App.Core</c>.
    /// </summary>
    public static IReadOnlyList<string> PublishedPackageNames { get; } =
    ["Altinn.App.Api", "Altinn.App.Core", "Altinn.App.Clients.Fiks"];

    /// <summary>
    /// The packages whose resolved version is the version of the libraries a project uses, in the order to look for
    /// them: <c>Altinn.App.Core</c>, or <c>Altinn.App.Api</c> for v6 and older, which have no Core. A project that
    /// uses neither has no published version, such as one with a build of a pull request in
    /// <c>Altinn.App.Core.Experimental</c>.
    /// </summary>
    public static IReadOnlyList<string> VersionPackageNames { get; } = ["Altinn.App.Core", "Altinn.App.Api"];

    /// <summary>
    /// The libraries' assemblies, of every version: those of <see cref="PublishedPackageNames"/>, and
    /// <c>Altinn.App.Common</c> and <c>Altinn.App.PlatformServices</c>, which the libraries had until v7. The
    /// Experimental packages carry the same assemblies.
    /// </summary>
    public static IReadOnlyList<string> AssemblyNames { get; } =
    [
        "Altinn.App.Api",
        "Altinn.App.Core",
        "Altinn.App.Clients.Fiks",
        "Altinn.App.Common",
        "Altinn.App.PlatformServices",
    ];

    /// <summary>Whether an assembly is one of <see cref="AssemblyNames"/>. Assembly names are compared exactly.</summary>
    public static bool IsAssembly(string? name)
    {
        if (name is null)
        {
            return false;
        }

        foreach (string assembly in AssemblyNames)
        {
            if (string.Equals(assembly, name, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }
}
