#nullable enable
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class PagedAccessListMembersResponse
    {
        public IEnumerable<AccessListMember> Data { get; set; }
        public string? NextPage { get; set; }
    }
}
