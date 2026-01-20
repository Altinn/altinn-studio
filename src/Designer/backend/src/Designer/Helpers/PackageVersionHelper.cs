#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using System.Xml.XPath;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Helpers
{
    public static class PackageVersionHelper
    {
        public static bool TryGetPackageVersionFromCsprojFile(string csprojFilePath, IReadOnlyList<string> packageNames, out SemanticVersion version)
        {
            version = null;
            var doc = XDocument.Load(csprojFilePath);
            var packageReferences = doc.XPathSelectElements("//PackageReference")
                .Where(element => packageNames.Contains(element.Attribute("Include")?.Value));

            foreach (var packageReference in packageReferences)
            {
                string versionString = packageReference.Attribute("Version")?.Value;
                if (string.IsNullOrEmpty(versionString))
                {
                    continue;
                }

                // Ensure that we also handle pinned versions like [1.2.3]
                // TODO: Consider other version range formats if needed
                versionString = versionString.Replace("[", string.Empty).Replace("]", string.Empty);

                if (SemanticVersion.TryParse(versionString, out version))
                {
                    return true;
                }
            }

            version = default;
            return false;
        }
    }
}
