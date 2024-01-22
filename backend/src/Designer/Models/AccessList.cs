#nullable enable

using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class AccessList
    {
        public string Identifier { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public IEnumerable<AccessListMember>? Members { get; set; }
    }
}
