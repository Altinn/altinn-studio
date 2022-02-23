using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Authorization.Functions.Models
{
    public class DelegationChangeEventList
    {
        [JsonPropertyName("l")]
        public List<DelegationChangeEvent> DelegationChangeEvents { get; set; }
    }
}
