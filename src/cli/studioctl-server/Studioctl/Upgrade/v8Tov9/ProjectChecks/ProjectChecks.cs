using System.Xml.Linq;
using NuGet.Versioning;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.ProjectChecks;

/// <summary>
/// Checks the project file for unsupported versions for the 'v8Tov9' upgrade
/// </summary>
internal sealed class ProjectChecks
{
    private readonly XDocument _doc;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProjectChecks"/> class.
    /// </summary>
    /// <param name="projectFilePath">Path to the project file to check</param>
    public ProjectChecks(string projectFilePath)
    {
        var xmlString = File.ReadAllText(projectFilePath);
        _doc = XDocument.Parse(xmlString);
    }

    /// <summary>
    /// Verifies that the project is using a supported version of Altinn.App.Api (and, if explicitly
    /// declared, Altinn.App.Core) for the 'v8Tov9' upgrade. Accepts versions &gt;= 8.0.0 and &lt; 9.0.0,
    /// including NuGet range/bracket syntax (e.g. "[8.11.3]", "[8.0,9.0)", "8.*").
    /// Also allows projects using ProjectReference instead of PackageReference (e.g., local development).
    /// </summary>
    /// <returns>True if Altinn.App.Api is present and in the supported version range (and Altinn.App.Core,
    /// if present, is too), or if using project references</returns>
    public bool SupportedSourceVersion()
    {
        // Check if using project references instead of package references
        if (HasAltinnProjectReferences())
        {
            return true;
        }

        // Altinn.App.Api is required; it pulls in a compatible Altinn.App.Core transitively.
        var altinnAppApiElements = GetAltinnAppApiElement();
        if (altinnAppApiElements is null || altinnAppApiElements.Count == 0)
        {
            return false;
        }

        // Check all Altinn.App.Api versions
        if (
            altinnAppApiElements
                .Select(apiElement => apiElement.Attribute("Version")?.Value)
                .Any(altinnAppApiVersion => !SupportedSourceVersion(altinnAppApiVersion))
        )
        {
            return false;
        }

        // Altinn.App.Core is only validated if explicitly declared; otherwise it's obtained
        // transitively via Altinn.App.Api and there's nothing explicit to check.
        var altinnAppCoreElements = GetAltinnAppCoreElement();
        if (altinnAppCoreElements is null || altinnAppCoreElements.Count == 0)
        {
            return true;
        }

        return altinnAppCoreElements
            .Select(coreElement => coreElement.Attribute("Version")?.Value)
            .All(altinnAppCoreVersion => SupportedSourceVersion(altinnAppCoreVersion));
    }

    /// <summary>
    /// Checks if the project uses ProjectReference for Altinn.App.Core or Altinn.App.Api
    /// instead of PackageReference (typical for local development setups).
    /// </summary>
    private bool HasAltinnProjectReferences()
    {
        var projectReferences = _doc
            .Root?.Elements("ItemGroup")
            .Elements("ProjectReference")
            .Select(x => x.Attribute("Include")?.Value)
            .Where(x => x != null)
            .ToList();

        if (projectReferences is null || projectReferences.Count == 0)
        {
            return false;
        }

        return projectReferences.Any(path =>
            path != null
            && (
                path.Contains("Altinn.App.Core", StringComparison.OrdinalIgnoreCase)
                || path.Contains("Altinn.App.Api", StringComparison.OrdinalIgnoreCase)
            )
        );
    }

    private List<XElement>? GetAltinnAppCoreElement()
    {
        return _doc
            .Root?.Elements("ItemGroup")
            .Elements("PackageReference")
            .Where(x => x.Attribute("Include")?.Value == "Altinn.App.Core")
            .ToList();
    }

    private List<XElement>? GetAltinnAppApiElement()
    {
        return _doc
            .Root?.Elements("ItemGroup")
            .Elements("PackageReference")
            .Where(x => x.Attribute("Include")?.Value == "Altinn.App.Api")
            .ToList();
    }

    /// <summary>
    /// Check that version is &gt;= 8.0.0 and &lt; 9.0.0
    /// </summary>
    /// <param name="version">The version string to check</param>
    /// <returns>True if version is in the supported range, false otherwise</returns>
    private bool SupportedSourceVersion(string? version)
    {
        if (version is null)
        {
            return false;
        }

        if (!VersionRange.TryParse(version, out var range))
        {
            return false;
        }

        // Covers exact versions ("8.11.3"), bracket/range syntax ("[8.11.3]", "[8.0,9.0)")
        // and floating versions ("8.*") — all resolve to a floor version we can check.
        return range.MinVersion?.Major == 8;
    }
}
