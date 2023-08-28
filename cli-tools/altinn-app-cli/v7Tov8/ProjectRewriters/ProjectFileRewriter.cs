using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace altinn_app_cli.v7Tov8.ProjectRewriters;

public class ProjectFileRewriter
{
    private XDocument doc;
    private readonly string projectFilePath;
    private readonly string targetVersion;

    public ProjectFileRewriter(string projectFilePath, string targetVersion = "8.0.0")
    {
        this.projectFilePath = projectFilePath;
        this.targetVersion = targetVersion;
        var xmlString = File.ReadAllText(projectFilePath);
        doc = XDocument.Parse(xmlString);
    }

    public async Task Upgrade()
    {
        var altinnAppCoreElements = GetAltinnAppCoreElement();
        var altinnAppApiElements = GetAltinnAppApiElement();
        if (altinnAppCoreElements != null && altinnAppApiElements != null)
        {
            altinnAppCoreElements.ForEach(c => c.Attribute("Version")?.SetValue(targetVersion));
            altinnAppApiElements.ForEach(a => a.Attribute("Version")?.SetValue(targetVersion));
            await Save();
        }
    }

    private List<XElement>? GetAltinnAppCoreElement()
    {
        return doc.Root?.Elements("ItemGroup").Elements("PackageReference").Where(x => x.Attribute("Include")?.Value == "Altinn.App.Core").ToList();
    }

    private List<XElement>? GetAltinnAppApiElement()
    {
        return doc.Root?.Elements("ItemGroup").Elements("PackageReference").Where(x => x.Attribute("Include")?.Value == "Altinn.App.Api").ToList();
    }

    private async Task Save()
    {
        XmlWriterSettings xws = new XmlWriterSettings();
        xws.Async = true;
        xws.OmitXmlDeclaration = true;
        xws.Indent = true;
        xws.Encoding = Encoding.UTF8;
        await using XmlWriter xw = XmlWriter.Create(projectFilePath, xws);
        await doc.WriteToAsync(xw, CancellationToken.None);
    }
}
