#nullable disable
namespace Altinn.Studio.Designer.Models
{
    public class AccessListMember
    {
        public required string OrgNr { get; set; }
        public required string OrgName { get; set; }
        public bool? IsSubParty { get; set; }
    }
}
