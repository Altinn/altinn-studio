#nullable enable

using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class AccessPackage
    {
        public required string Id { get; set; }

        public required string Urn { get; set; }

        public string Name { get; set; }

        public string Description { get; set; }

        public List<AccessPackageTag> Tags { get; set; } = [];
        
        public AccessPackageArea Area { get; set; }

        public List<AccessPackageService> Services { get; set; } = [];
    }
}
