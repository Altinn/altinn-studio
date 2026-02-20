using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.ProjectChecks;

/// <summary>
/// Checks the project file for unsupported versions for the 'v8Tov10' upgrade
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
    /// Verifies that the project is using supported versions of Altinn.App.Api and Altinn.App.Core
    /// for the 'v8Tov10' upgrade. Accepts versions &gt;= 8.0.0 and &lt; 9.0.0.
    /// </summary>
    /// <returns>True if both packages are present and in the supported version range, false otherwise</returns>
    public bool SupportedSourceVersion()
    {
        var altinnAppCoreElements = GetAltinnAppCoreElement();
        var altinnAppApiElements = GetAltinnAppApiElement();

        // Both packages must be present
        if (altinnAppCoreElements is null || altinnAppApiElements is null)
        {
            return false;
        }

        // If no elements found for either package, fail
        if (altinnAppCoreElements.Count == 0 || altinnAppApiElements.Count == 0)
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

        // Check all Altinn.App.Core versions
        return altinnAppCoreElements
            .Select(coreElement => coreElement.Attribute("Version")?.Value)
            .All(altinnAppCoreVersion => SupportedSourceVersion(altinnAppCoreVersion));
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

        var versionParts = version.Split('.');
        if (versionParts.Length < 3)
        {
            return false;
        }

        if (!int.TryParse(versionParts[0], out int major))
        {
            return false;
        }

        // Must be version 8.x.x (>= 8.0.0 and < 9.0.0)
        return major == 8;
    }
}
