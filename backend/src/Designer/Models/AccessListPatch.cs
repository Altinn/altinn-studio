#nullable enable

namespace Altinn.Studio.Designer.Models
{
    public class AccessListPatch
    {
        public string Op { get; set; }
        public string Path { get; set; }
        public string? Value { get; set; }
    }
}
