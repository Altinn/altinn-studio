#nullable enable

namespace PolicyAdmin.Models
{
    public class AccessPackageArea
    {
        public required string Id { get; set; }

        public required string Urn { get; set; }

        public required string Name { get; set; }

        public string? Description { get; set; }

        public string? Icon { get; set; }

        public IEnumerable<AccessPackageOption> Packages { get; set; } = [];
    }
}
