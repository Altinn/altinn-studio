using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.Functions.Models
{
    public class DelegationEvent
    {
        [JsonPropertyName("event")]
        public string Event { get; set; }

        [JsonPropertyName("changeId")]
        public int ChangeId { get; set; }

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; }

        [JsonPropertyName("altinnAppId")]
        public string AltinnAppId { get; set; }

        [JsonPropertyName("offeredByPartyId")]
        public int OfferedByPartyId { get; set; }

        [JsonPropertyName("coveredByPartyId")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? CoveredByPartyId { get; set; }

        [JsonPropertyName("coveredByUserId")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? CoveredByUserId { get; set; }

        [JsonPropertyName("performedByUserId")]
        public int PerformedByUserId { get; set; }
    }
}
