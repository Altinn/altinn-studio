using System;
using System.Linq;
using System.Xml.Linq;

namespace Designer.Helpers;

public static class CsprojPatcher
{
    /// <summary>
    /// Upserts a PackageReference into a .csproj file. If an entry with the same Include exists,
    /// it updates Version (attribute or child element). Otherwise it adds a new PackageReference.
    /// </summary>
    /// <returns>true if the file was modified; otherwise false.</returns>
    public static bool UpsertPackageReference(
        string csprojPath,
        string include,
        string version)
    {
        // Preserve whitespace as much as possible.
        var doc = XDocument.Load(csprojPath, LoadOptions.None);

        var project = doc.Root;
        if (project == null || project.Name.LocalName != "Project")
        {
            throw new InvalidOperationException("Not a valid SDK-style .csproj (missing <Project> root).");
        }

        // .csproj may or may not have a default namespace. Use the root's namespace.
        XNamespace ns = project.Name.Namespace;

        // Helper for names with namespace
        XName N(string local) => ns + local;

        var existing = project
            .Descendants(N("PackageReference"))
            .FirstOrDefault(pr =>
            {
                var inc = (string?)pr.Attribute("Include");
                if (!string.Equals(inc, include, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                return true;
            });

        bool changed = false;

        if (existing != null)
        {
            changed |= EnsureVersion(existing, N("Version"), version);

            // Optionally upsert Condition attribute if caller provided it and it's different/missing.

            if (changed)
            {
                doc.Save(csprojPath);
            }

            return changed;
        }

        // No existing reference. Create it.
        var newRef = new XElement(N("PackageReference"));
        newRef.SetAttributeValue("Include", include);
        newRef.SetAttributeValue("Version", version);

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

        doc.Save(csprojPath, SaveOptions.None);
        return true;
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
