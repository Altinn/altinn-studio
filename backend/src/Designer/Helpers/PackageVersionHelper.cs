using System.Linq;
using System.Xml.Linq;
using System.Xml.XPath;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Helpers
{
    public static class PackageVersionHelper
    {
        public static bool TryGetPackageVersionFromCsprojFile(string csprojFilePath, string packageName, out SemanticVersion version)
        {
            version = null;
            var doc = XDocument.Load(csprojFilePath);
            var packageReferences = doc.XPathSelectElements("//PackageReference")
                .Where(element => element.Attribute("Include")?.Value == packageName).ToList();

            if (packageReferences.Count != 1)
            {
                return false;
            }

            var packageReference = packageReferences.First();

            string versionString = packageReference.Attribute("Version")?.Value;
            if (string.IsNullOrEmpty(versionString))
            {
                return false;
            }

            return SemanticVersion.TryParse(versionString, out version);
        }
    }
}
