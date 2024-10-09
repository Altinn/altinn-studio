using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class AccessPackageCategory
    {
        public string? Id { get; set; }

        public Dictionary<string, string> Name { get; set; }

        public Dictionary<string, string>? Description { get; set; }

        public List<AccessPackage> AccessPackages { get; set; } = [];
    }
}
