#nullable enable

namespace PolicyAdmin.Models
{
    public class AccessPackageOption
    {
        public required string Id { get; set; }

        public required string Urn { get; set; }

        public string Name { get; set; }

        public string Description { get; set; }

        public List<AccessPackageTag> Tags { get; set; } = [];

        public AccessPackageArea Area { get; set; }
    }
}
