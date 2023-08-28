using System.Xml.Linq;

namespace altinn_app_cli.v7Tov8.ProjectChecks;

public class ProjectChecks
{
    private XDocument doc;
    
    public ProjectChecks(string projectFilePath)
    {
        var xmlString = File.ReadAllText(projectFilePath);
        doc = XDocument.Parse(xmlString);
    }

    public bool SupportedSourceVersion()
    {
        var altinnAppCoreElements = GetAltinnAppCoreElement();
        var altinnAppApiElements = GetAltinnAppApiElement();
        if (altinnAppCoreElements == null || altinnAppApiElements == null)
        {
            return false;
        }

        if (altinnAppApiElements.Select(apiElement => apiElement.Attribute("Version")?.Value).Any(altinnAppApiVersion => !SupportedSourceVersion(altinnAppApiVersion)))
        {
            return false;
        }

        return altinnAppCoreElements.Select(coreElement => coreElement.Attribute("Version")?.Value).All(altinnAppCoreVersion => SupportedSourceVersion(altinnAppCoreVersion));

    }
    
    private List<XElement>? GetAltinnAppCoreElement()
    {
        return doc.Root?.Elements("ItemGroup").Elements("PackageReference").Where(x => x.Attribute("Include")?.Value == "Altinn.App.Core").ToList();
    }

    private List<XElement>? GetAltinnAppApiElement()
    {
        return doc.Root?.Elements("ItemGroup").Elements("PackageReference").Where(x => x.Attribute("Include")?.Value == "Altinn.App.Api").ToList();
    }

    /// <summary>
    /// Check that version is >=7.0.0
    /// </summary>
    /// <param name="version"></param>
    /// <returns></returns>
    private bool SupportedSourceVersion(string? version)
    {
        if (version == null)
        {
            return false;
        }

        var versionParts = version.Split('.');
        if (versionParts.Length < 3)
        {
            return false;
        }

        if (int.TryParse(versionParts[0], out int major))
        {
            if (major >= 7)
            {
                return true;
            }
        }

        return false;
    }
}
