using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;

namespace Altinn.Studio.Designer.Helpers;

public static class CsprojPatcher
{
    /// <summary>
    /// Upserts multiple PackageReferences into a .csproj file in a single read/write operation.
    /// </summary>
    /// <param name="csprojPath">Path to the .csproj file</param>
    /// <param name="packageReferences">List of (Include, Version) tuples</param>
    /// <returns>true if the file was modified; otherwise false.</returns>
    public static bool UpsertPackageReferences(
        string csprojPath,
        List<(string Include, string Version)> packageReferences
    )
    {
        if (packageReferences is null || packageReferences.Count is 0)
        {
            return false;
        }

        // Preserve whitespace as much as possible.
        XDocument doc = XDocument.Load(csprojPath, LoadOptions.None);

        XElement? project = doc.Root;
        if (project == null || project.Name.LocalName != "Project")
        {
            throw new InvalidOperationException("Not a valid SDK-style .csproj (missing <Project> root).");
        }

        XNamespace ns = project.Name.Namespace;
        XName N(string local) => ns + local;

        bool anyChanged = false;

        foreach (var packageRef in packageReferences)
        {
            XElement? existing = project
                .Descendants(N("PackageReference"))
                .FirstOrDefault(pr =>
                {
                    string? inc = (string?)pr.Attribute("Include");
                    return string.Equals(inc, packageRef.Include, StringComparison.OrdinalIgnoreCase);
                });

            if (existing != null)
            {
                anyChanged |= EnsureVersion(existing, N("Version"), packageRef.Version);
            }
            else
            {
                XElement? newRef = new XElement(N("PackageReference"));
                newRef.SetAttributeValue("Include", packageRef.Include);
                newRef.SetAttributeValue("Version", packageRef.Version);

                XElement? itemGroupWithPackages = project
                    .Elements(N("ItemGroup"))
                    .FirstOrDefault(ig => ig.Elements(N("PackageReference")).Any());

                if (itemGroupWithPackages != null)
                {
                    itemGroupWithPackages.Add(newRef);
                }
                else
                {
                    XElement? newItemGroup = new XElement(N("ItemGroup"));
                    newItemGroup.Add(newRef);
                    project.Add(newItemGroup);
                }

                anyChanged = true;
            }
        }

        if (anyChanged)
        {
            doc.Save(csprojPath, SaveOptions.None);
        }

        return anyChanged;
    }

    /// <summary>
    /// Ensures the PackageReference has the requested version.
    /// Supports both Version attribute and nested &lt;Version&gt; element.
    /// Prefers Version attribute going forward.
    /// </summary>
    private static bool EnsureVersion(XElement packageReference, XName versionElementName, string desiredVersion)
    {
        var versionAttr = packageReference.Attribute("Version");
        if (versionAttr != null)
        {
            return UpdateVersionAttribute(packageReference, versionElementName, versionAttr, desiredVersion);
        }

        var versionChild = packageReference.Elements(versionElementName).FirstOrDefault();
        if (versionChild != null)
        {
            return UpdateVersionElement(versionChild, desiredVersion);
        }

        return SetVersionAttribute(packageReference, desiredVersion);
    }

    private static bool UpdateVersionAttribute(
        XElement packageReference,
        XName versionElementName,
        XAttribute versionAttr,
        string desiredVersion)
    {
        bool changed = false;

        if (!string.Equals(versionAttr.Value, desiredVersion, StringComparison.Ordinal))
        {
            versionAttr.Value = desiredVersion;
            changed = true;
        }

        XElement? versionChild = packageReference.Elements(versionElementName).FirstOrDefault();
        if (versionChild != null)
        {
            versionChild.Remove();
            changed = true;
        }

        return changed;
    }

    private static bool UpdateVersionElement(XElement versionElement, string desiredVersion)
    {
        if (!string.Equals(versionElement.Value, desiredVersion, StringComparison.Ordinal))
        {
            versionElement.Value = desiredVersion;
            return true;
        }

        return false;
    }

    private static bool SetVersionAttribute(XElement packageReference, string desiredVersion)
    {
        packageReference.SetAttributeValue("Version", desiredVersion);
        return true;
    }
}
