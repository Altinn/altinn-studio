#nullable enable
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class PagedAccessListResponse
    {
        public required IEnumerable<AccessList> Data { get; set; }
        public string? NextPage { get; set; }
    }
}
