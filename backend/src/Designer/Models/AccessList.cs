﻿#nullable enable

using System.Collections.Generic;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Models
{

    public class AccessList
    {
        public string Identifier { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public string? Etag { get; set; }
        public IEnumerable<AccessListResourceConnection>? ResourceConnections { get; set; }
    }
}
