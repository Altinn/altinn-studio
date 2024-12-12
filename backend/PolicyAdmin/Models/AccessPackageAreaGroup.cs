#nullable enable

namespace PolicyAdmin.Models
{
    public class AccessPackageAreaGroup
    {
        public required string Id { get; set; }

        public required string Urn { get; set; }

        public string Name { get; set; }

        public string Description { get; set; }

        public string Type { get; set; }

        public IEnumerable<AccessPackageArea> Areas { get; set; }
    }
}
