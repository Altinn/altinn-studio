using System.Xml.Linq;
using NuGet.Versioning;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.ProjectChecks;

/// <summary>
/// Checks the project file for unsupported versions for the 'v8Tov9' upgrade
/// </summary>
internal sealed class ProjectChecks
{
    private static readonly NuGetVersion _nineZero = new(9, 0, 0);

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
    /// Returns whether all declared Altinn.App package versions already target v9. This lets an
    /// interrupted or completed upgrade resume without treating its own project-file change as an
    /// unsupported source version.
    /// </summary>
    public bool IsTargetVersion()
    {
        if (HasAltinnProjectReferences())
            return false;

        var apiElements = GetAltinnAppApiElement();
        if (apiElements is null || apiElements.Count == 0)
            return false;

        var packageElements = apiElements.Concat(GetAltinnAppCoreElement() ?? []).ToList();
        return packageElements
            .Select(element => element.Attribute("Version")?.Value)
            .All(version => HasMajorVersion(version, 9));
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

        if (range.MinVersion?.Major != 8)
        {
            return false;
        }

        // A floating version ("8.*") is bounded to its major version by definition.
        if (range.IsFloating)
        {
            return true;
        }

        // A bare version ("8.11.3", no "[...]"/"(...)" syntax) is a pinned floor, not an
        // open-ended range - NuGet resolves it to that specific version.
        var isExplicitRange = version.StartsWith('[') || version.StartsWith('(');
        if (!isExplicitRange)
        {
            return true;
        }

        // Explicit bracket/range syntax must not admit any version >= 9.0.0
        // (e.g. "[8.0,9.0]", "[8.0,10.0)" and "[8.0,)" are all rejected).
        if (range.MaxVersion is null)
        {
            return false;
        }

        return range.MaxVersion < _nineZero || (range.MaxVersion == _nineZero && !range.IsMaxInclusive);
    }

    private static bool HasMajorVersion(string? version, int major)
    {
        if (version is null || !VersionRange.TryParse(version, out var range))
            return false;

        if (range.MinVersion?.Major != major)
            return false;

        if (range.IsFloating || (!version.StartsWith('[') && !version.StartsWith('(')))
            return true;

        var nextMajor = new NuGetVersion(major + 1, 0, 0);
        return range.MaxVersion is not null
            && (range.MaxVersion < nextMajor || (range.MaxVersion == nextMajor && !range.IsMaxInclusive));
    }
}
