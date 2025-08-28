namespace PolicyAdmin.Models
{
    public class SubjectOption
    {
        public required string Id { get; set; }

        public required string Name { get; set; }

        public string? Description { get; set; }

        public string? Urn { get; set; }

        public string? LegacyRoleCode { get; set; }

        public string? LegacyUrn { get; set; }

        public required SubjectOptionProvider Provider { get; set; }
    }

    public class SubjectOptionProvider
    {
        public required string Id { get; set; }

        public required string Name { get; set; }

        public required string Code { get; set; }
    }
}
