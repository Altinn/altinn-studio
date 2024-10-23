#nullable enable

using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class AccessPackageTagGroup
    {
        public required string Id { get; set; }

        public required Dictionary<string, string> Name { get; set; }
    }
}
