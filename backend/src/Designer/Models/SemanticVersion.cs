using System;
using System.Linq;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Designer.Models
{
    public class SemanticVersion
    {
        public string Version { get; }

        public int Major => int.Parse(Version.Split('.').First());

        public SemanticVersion(string version)
        {
            ValidateVersion(version);
            Version = version;
        }


        private static void ValidateVersion(string version)
        {
            if (version.Length > 50)
            {
                throw new ArgumentException("Provided version is too long");
            }
            if (!Regex.IsMatch(version, "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$"))
            {
                throw new ArgumentException("Provided version is not valid");
            }
        }

    }
}
