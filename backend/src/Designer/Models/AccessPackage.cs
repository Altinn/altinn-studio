using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class AccessPackage
    {
        public string? Urn { get; set; }

        public Dictionary<string, string> Name { get; set; }

        public Dictionary<string, string>? Description { get; set; }

        public List<AccessPackageService> Services { get; set; } = [];
    }
}
