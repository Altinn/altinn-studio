using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;

namespace Designer.Helpers;

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
        List<(string Include, string Version)> packageReferences)
    {
        if (packageReferences == null || !packageReferences.Any())
        {
            return false;
        }

        // Preserve whitespace as much as possible.
        var doc = XDocument.Load(csprojPath, LoadOptions.None);

        var project = doc.Root;
        if (project == null || project.Name.LocalName != "Project")
        {
            throw new InvalidOperationException("Not a valid SDK-style .csproj (missing <Project> root).");
        }

        XNamespace ns = project.Name.Namespace;
        XName N(string local) => ns + local;

        bool anyChanged = false;

        foreach (var packageRef in packageReferences)
        {
            var existing = project
                .Descendants(N("PackageReference"))
                .FirstOrDefault(pr =>
                {
                    var inc = (string?)pr.Attribute("Include");
                    return string.Equals(inc, packageRef.Include, StringComparison.OrdinalIgnoreCase);
                });

            if (existing != null)
            {
                anyChanged |= EnsureVersion(existing, N("Version"), packageRef.Version);
            }
            else
            {
                var newRef = new XElement(N("PackageReference"));
                newRef.SetAttributeValue("Include", packageRef.Include);
                newRef.SetAttributeValue("Version", packageRef.Version);

                var itemGroupWithPackages = project
                    .Elements(N("ItemGroup"))
                    .FirstOrDefault(ig => ig.Elements(N("PackageReference")).Any());

                if (itemGroupWithPackages != null)
                {
                    itemGroupWithPackages.Add(newRef);
                }
                else
                {
                    var newItemGroup = new XElement(N("ItemGroup"));
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
        bool changed = false;

        // Case 1: Version attribute exists
        var versionAttr = packageReference.Attribute("Version");
        if (versionAttr != null)
        {
            if (!string.Equals(versionAttr.Value, desiredVersion, StringComparison.Ordinal))
            {
                versionAttr.Value = desiredVersion;
                changed = true;
            }

            // If there's also a <Version> child (uncommon but possible), remove it to avoid ambiguity
            var versionChild = packageReference.Elements(versionElementName).FirstOrDefault();
            if (versionChild != null)
            {
                versionChild.Remove();
                changed = true;
            }

            return changed;
        }

        // Case 2: <Version> child exists
        var child = packageReference.Elements(versionElementName).FirstOrDefault();
        if (child != null)
        {
            if (!string.Equals(child.Value, desiredVersion, StringComparison.Ordinal))
            {
                child.Value = desiredVersion;
                changed = true;
            }

            return changed;
        }

        // Case 3: no version specified -> set attribute
        packageReference.SetAttributeValue("Version", desiredVersion);
        return true;
    }
}
