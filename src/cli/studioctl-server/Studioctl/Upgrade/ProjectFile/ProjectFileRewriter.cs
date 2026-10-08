using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.ProjectFile;

/// <summary>
/// Upgrade the csproj file
/// </summary>
internal sealed class ProjectFileRewriter
{
    private readonly XDocument _doc;
    private readonly XDocument _originalDoc;
    private readonly string _projectFilePath;
    private readonly string _targetVersion;
    private readonly string _targetFramework;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProjectFileRewriter"/> class.
    /// </summary>
    /// <param name="projectFilePath"></param>
    /// <param name="targetVersion"></param>
    /// <param name="targetFramework"></param>
    public ProjectFileRewriter(
        string projectFilePath,
        string targetVersion = "8.0.0",
        string targetFramework = "net8.0"
    )
    {
        _projectFilePath = projectFilePath;
        _targetVersion = targetVersion;
        var xmlString = File.ReadAllText(projectFilePath);
        _doc = XDocument.Parse(xmlString);
        _originalDoc = XDocument.Parse(xmlString);
        _targetFramework = targetFramework;
    }

    /// <summary>
    /// Upgrades and writes an upgraded version of the project file to disk
    /// </summary>
    public async Task Upgrade()
    {
        var altinnAppCoreElements = GetAltinnAppCoreElement();
        altinnAppCoreElements?.ForEach(c => c.Attribute("Version")?.SetValue(_targetVersion));

        var altinnAppApiElements = GetAltinnAppApiElement();
        altinnAppApiElements?.ForEach(a => a.Attribute("Version")?.SetValue(_targetVersion));

        IgnoreWarnings("1591", "1998"); // Require xml doc and await in async methods

        GetTargetFrameworkElement()?.ForEach(t => t.SetValue(_targetFramework));

        await Save();
    }

    /// <summary>Removes every <c>PackageReference</c> to <paramref name="packageName"/>.</summary>
    /// <returns>Whether the project referenced the package at all, so the caller can report accurately.</returns>
    public async Task<bool> RemovePackageReference(string packageName)
    {
        var packageElements = GetPackageReferenceElement(packageName);
        packageElements?.ForEach(e => e.Remove());
        await Save();
        return packageElements is { Count: > 0 };
    }

    public async Task SetTargetFramework()
    {
        GetTargetFrameworkElement()?.ForEach(t => t.SetValue(_targetFramework));
        await Save();
    }

    /// <summary>
    /// Turns on the SDK's implicit global usings (<c>ImplicitUsings=enable</c>) and adds a global
    /// <c>Using</c> item for each of <paramref name="namespaces"/>. Anything already in place is kept
    /// as is, so running this again on an upgraded project changes nothing.
    /// </summary>
    /// <returns>What was added, so the caller can report accurately.</returns>
    public async Task<ImplicitUsingsChange> EnableImplicitUsings(params string[] namespaces)
    {
        var enabledImplicitUsings = EnableImplicitUsingsProperty();
        var addedNamespaces = namespaces.Where(AddGlobalUsing).ToArray();
        await Save();
        return new ImplicitUsingsChange(enabledImplicitUsings, addedNamespaces);
    }

    private bool EnableImplicitUsingsProperty()
    {
        var properties = _doc.Root?.Elements("PropertyGroup").Elements("ImplicitUsings").ToList() ?? [];
        if (properties.Count == 0)
        {
            var propertyGroup = _doc.Root?.Elements("PropertyGroup").FirstOrDefault();
            if (propertyGroup is null)
            {
                propertyGroup = new XElement("PropertyGroup");
                _doc.Root?.AddFirst(propertyGroup);
            }

            propertyGroup.Add(new XElement("ImplicitUsings", "enable"));
            return true;
        }

        var changed = false;
        foreach (var property in properties)
        {
            if (string.Equals(property.Value.Trim(), "enable", StringComparison.OrdinalIgnoreCase))
                continue;

            property.SetValue("enable");
            changed = true;
        }

        return changed;
    }

    private bool AddGlobalUsing(string ns)
    {
        var usings = _doc.Root?.Elements("ItemGroup").Elements("Using").ToList() ?? [];
        // An aliased or static item does not bring the namespace into scope, so it does not count.
        if (usings.Any(u => ProjectGlobalUsings.IsNamespaceImport(u) && IncludesNamespace(u, ns)))
            return false;

        // Keep global usings together: extend the item group that already declares one, otherwise
        // open a new group right after the property group that switched implicit usings on.
        var itemGroup = usings.Select(u => u.Parent).OfType<XElement>().FirstOrDefault();
        if (itemGroup is null)
        {
            itemGroup = new XElement("ItemGroup");
            var propertyGroup = _doc.Root?.Elements("PropertyGroup").Elements("ImplicitUsings").First().Parent;
            propertyGroup?.AddAfterSelf(itemGroup);
        }

        itemGroup.Add(new XElement("Using", new XAttribute("Include", ns)));
        return true;
    }

    // An Include attribute is an MSBuild item list, so "A;B" declares two global usings.
    private static bool IncludesNamespace(XElement usingItem, string ns) =>
        usingItem
            .Attribute("Include")
            ?.Value.Split(';', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Contains(ns, StringComparer.Ordinal)
        ?? false;

    /// <summary>
    /// Sets the <c>Version</c> attribute of existing <c>PackageReference</c> elements. Used to raise
    /// explicit package versions to the floors a newer Altinn.App version requires (NU1605 downgrades).
    /// Only packages already referenced explicitly are updated; the returned set is those that were
    /// found and changed, so the caller can report packages that need a manual reference added.
    /// </summary>
    /// <param name="versionsByPackage">Package id → required version.</param>
    /// <returns>The package ids that had an explicit reference and were updated.</returns>
    public async Task<IReadOnlyCollection<string>> SetPackageReferenceVersions(
        IReadOnlyDictionary<string, string> versionsByPackage
    )
    {
        var updated = new List<string>();
        foreach (var (packageName, version) in versionsByPackage)
        {
            var packageElements = GetPackageReferenceElement(packageName);
            if (packageElements is null || packageElements.Count == 0)
            {
                continue;
            }

            packageElements.ForEach(e => e.SetAttributeValue("Version", version));
            updated.Add(packageName);
        }

        await Save();
        return updated;
    }

    /// <summary>
    /// Converts package references to project references for local development and updates target framework
    /// </summary>
    public async Task ConvertToProjectReferences(string repoRoot)
    {
        var projectDir = Path.GetDirectoryName(_projectFilePath);
        if (projectDir == null)
        {
            throw new InvalidOperationException($"Could not determine directory for project file: {_projectFilePath}");
        }

        if (!Directory.Exists(Path.Combine(repoRoot, "src", "App")))
        {
            throw new InvalidOperationException(
                "Could not find repository root containing src/App. "
                    + "Pass the altinn-studio repository root directory."
            );
        }

        // Update target framework
        GetTargetFrameworkElement()?.ForEach(t => t.SetValue(_targetFramework));

        // Define the packages to convert and their relative project paths
        var packagesInfo = new[]
        {
            (
                Package: "Altinn.App.Core",
                RelPath: new[] { "src", "App", "backend", "src", "Altinn.App.Core", "Altinn.App.Core.csproj" }
            ),
            (
                Package: "Altinn.App.Api",
                RelPath: new[] { "src", "App", "backend", "src", "Altinn.App.Api", "Altinn.App.Api.csproj" }
            ),
            (
                Package: "Altinn.Codelists",
                RelPath: new[] { "src", "App", "codelists", "src", "Altinn.Codelists", "Altinn.Codelists.csproj" }
            ),
            (
                Package: "Altinn.FileAnalyzers",
                RelPath: new[]
                {
                    "src",
                    "App",
                    "fileanalyzers",
                    "src",
                    "Altinn.FileAnalyzers",
                    "Altinn.FileAnalyzers.csproj",
                }
            ),
        };

        var itemGroup = _doc.Root?.Elements("ItemGroup").FirstOrDefault(ig => ig.Elements("PackageReference").Any());

        bool createdNewItemGroup = false;
        if (itemGroup == null)
        {
            // Create a new ItemGroup if none exists
            itemGroup = new XElement("ItemGroup");
            _doc.Root?.Add(itemGroup);
            createdNewItemGroup = true;
        }

        bool addedAnyProjectReferences = false;
        foreach (var (packageName, relPath) in packagesInfo)
        {
            // Check if package reference exists
            var packageElements = GetPackageReferenceElement(packageName);
            if (packageElements != null && packageElements.Count > 0)
            {
                // Build the full project path
                var projectPath = Path.Combine(repoRoot, Path.Combine(relPath));

                // Check if the project file actually exists
                if (!File.Exists(projectPath))
                {
                    UpgradeConsole.WriteLine(
                        $"Warning: Project file not found: {projectPath}. Skipping {packageName}."
                    );
                    continue;
                }

                // Calculate relative path from the app project to the library project
                var relativePath = Path.GetRelativePath(projectDir, projectPath);

                // Remove package reference
                packageElements.ForEach(e => e.Remove());

                // Add project reference
                var projectReference = new XElement("ProjectReference", new XAttribute("Include", relativePath));
                itemGroup.Add(projectReference);
                addedAnyProjectReferences = true;

                UpgradeConsole.WriteLine($"Converted {packageName} from package reference to project reference");
            }
        }

        // If we created a new ItemGroup but didn't add anything to it, remove it
        if (createdNewItemGroup && !addedAnyProjectReferences)
        {
            itemGroup.Remove();
        }

        await Save();
    }

    private void IgnoreWarnings(params string[] warnings)
    {
        var noWarn = _doc.Root?.Elements("PropertyGroup").Elements("NoWarn").ToList();
        switch (noWarn?.Count)
        {
            case 0:
                _doc.Root?.Elements("PropertyGroup")
                    .First()
                    .Add(new XElement("NoWarn", "$(NoWarn);" + string.Join(';', warnings)));
                break;

            case 1:
                var valueElement = noWarn[0];
                foreach (var warning in warnings)
                {
                    if (!valueElement.Value.Contains(warning))
                    {
                        valueElement.SetValue($"{valueElement.Value};{warning}");
                    }
                }

                break;
        }
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

    private List<XElement>? GetTargetFrameworkElement()
    {
        return _doc.Root?.Elements("PropertyGroup").Elements("TargetFramework").ToList();
    }

    private List<XElement>? GetPackageReferenceElement(string packageName)
    {
        return _doc
            .Root?.Elements("ItemGroup")
            .Elements("PackageReference")
            .Where(x => string.Equals(x.Attribute("Include")?.Value, packageName, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    private async Task Save()
    {
        // Compare the current document with the original to detect actual changes
        // This comparison ignores formatting differences and only checks semantic changes
        if (XNode.DeepEquals(_doc, _originalDoc))
        {
            return;
        }

        XmlWriterSettings xws = new XmlWriterSettings();
        xws.Async = true;
        xws.OmitXmlDeclaration = true;
        xws.Indent = true;
        xws.Encoding = Encoding.UTF8;
        await using XmlWriter xw = XmlWriter.Create(_projectFilePath, xws);
        await _doc.WriteToAsync(xw, CancellationToken.None);
        await xw.FlushAsync();
    }
}

/// <summary>
/// What <see cref="ProjectFileRewriter.EnableImplicitUsings"/> added to the project file.
/// </summary>
/// <param name="EnabledImplicitUsings">Whether <c>ImplicitUsings</c> was switched on (it was missing or disabled).</param>
/// <param name="AddedNamespaces">The namespaces that got a new global <c>Using</c> item.</param>
internal sealed record ImplicitUsingsChange(bool EnabledImplicitUsings, IReadOnlyList<string> AddedNamespaces)
{
    public bool Any => EnabledImplicitUsings || AddedNamespaces.Count > 0;
}
