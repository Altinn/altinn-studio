using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.ProjectRewriters;

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

    /// <summary>
    /// Removes a package reference from the project file
    /// </summary>
    /// <param name="packageName">The name of the package to remove</param>
    public async Task RemovePackageReference(string packageName)
    {
        var packageElements = GetPackageReferenceElement(packageName);
        packageElements?.ForEach(e => e.Remove());
        await Save();
    }

    /// <summary>
    /// Converts package references to project references for local development and updates target framework
    /// </summary>
    public async Task ConvertToProjectReferences()
    {
        var projectDir = Path.GetDirectoryName(_projectFilePath);
        if (projectDir == null)
        {
            throw new InvalidOperationException($"Could not determine directory for project file: {_projectFilePath}");
        }

        // Get the repository root (where src/App is located)
        // First try to find it from the CLI assembly location (when running from source)
        // Then fall back to environment variable ALTINN_STUDIO_ROOT
        var repoRoot = FindRepositoryRootFromCli() ?? Environment.GetEnvironmentVariable("ALTINN_STUDIO_ROOT");

        if (repoRoot == null || !Directory.Exists(Path.Combine(repoRoot, "src", "App")))
        {
            throw new InvalidOperationException(
                "Could not find repository root containing src/App. "
                    + "Please set the ALTINN_STUDIO_ROOT environment variable to the altinn-studio repository root directory."
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
                    Console.WriteLine($"Warning: Project file not found: {projectPath}. Skipping {packageName}.");
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

                Console.WriteLine($"Converted {packageName} from package reference to project reference");
            }
        }

        // If we created a new ItemGroup but didn't add anything to it, remove it
        if (createdNewItemGroup && !addedAnyProjectReferences)
        {
            itemGroup.Remove();
        }

        await Save();
    }

    /// <summary>
    /// Finds the repository root containing src/App by looking at the CLI assembly location
    /// </summary>
    /// <returns>The repository root path or null if not found</returns>
    private static string? FindRepositoryRootFromCli()
    {
        // Get the location of the currently executing assembly
        var assemblyLocation = System.Reflection.Assembly.GetExecutingAssembly().Location;
        if (string.IsNullOrEmpty(assemblyLocation))
        {
            return null;
        }

        // ! Path.GetDirectoryName returns non-null for assembly locations
        var currentDir = new DirectoryInfo(Path.GetDirectoryName(assemblyLocation)!);
        while (currentDir != null)
        {
            var srcAppPath = Path.Combine(currentDir.FullName, "src", "App");
            if (Directory.Exists(srcAppPath))
            {
                return currentDir.FullName;
            }
            currentDir = currentDir.Parent;
        }
        return null;
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
            .Where(x => x.Attribute("Include")?.Value == packageName)
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
