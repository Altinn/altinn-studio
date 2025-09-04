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

    private async Task Save()
    {
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
