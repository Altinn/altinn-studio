namespace PolicyAdmin.Models
{
    public class AccessPackage
    {
        public string? Urn { get; set; }

        public Dictionary<string, string> Name { get; set; }

        public Dictionary<string, string>? Description { get; set; }
    }
}
