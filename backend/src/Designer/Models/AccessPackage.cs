#nullable enable

using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class AccessPackage
    {
        public required string Urn { get; set; }

        public required Dictionary<string, string> Name { get; set; }

        public Dictionary<string, string>? Description { get; set; }

        public required string Category { get; set; }
        
        public List<AccessPackageService> Services { get; set; } = [];
    }
}
