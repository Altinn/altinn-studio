#nullable enable
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto
{
    public class PaginatedLinks
    {
        public string Next { get; set; }
    }
    public class AccessListInfoDtoPaginated
    {
        public IEnumerable<AccessList> Data { get; set; }
        public PaginatedLinks? Links {  get; set; }
    }
}
