using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto
{
    public class AccessListInfoDtoPaginated
    {
        public required IEnumerable<AccessList> Data { get; set; }
        public AccessListPaging? Links { get; set; }
    }
}
