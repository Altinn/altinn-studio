#nullable enable

using System.Collections.Generic;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Models
{

    public class AccessList : HeaderEtag
    {
        public required string Identifier { get; set; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        public IEnumerable<AccessListResourceConnection>? ResourceConnections { get; set; }
    }
}
