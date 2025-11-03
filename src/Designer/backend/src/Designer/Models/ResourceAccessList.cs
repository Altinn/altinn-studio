#nullable disable
namespace Altinn.Studio.Designer.Models
{
    public class ResourceAccessList
    {
        public string AccessListIdentifier { get; set; }
        public string ResourceIdentifier { get; set; }
        public string[] Actions { get; set; }
        public string AccessListName { get; set; }
    }
}
