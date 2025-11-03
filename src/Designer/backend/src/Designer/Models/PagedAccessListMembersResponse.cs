using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class PagedAccessListMembersResponse : HeaderEtag
    {
        public required IEnumerable<AccessListMember> Data { get; set; }
        public string? NextPage { get; set; }
    }
}
