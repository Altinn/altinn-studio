#nullable enable

using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class AccessPackageArea
    {
        public required string Id { get; set; }

        public string Name { get; set; }

        public string Description { get; set; }

        public string ShortDescription { get; set; }

        public string IconName { get; set; }
    }
}
