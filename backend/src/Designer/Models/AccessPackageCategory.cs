#nullable enable

using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class AccessPackageCategory
    {
        public required string Id { get; set; }

        public required Dictionary<string, string> Name { get; set; }

        public Dictionary<string, string>? Description { get; set; }
        
        public string Icon { get; set; }

        public required Dictionary<string, string> ShortDescription { get; set; }
    }
}
