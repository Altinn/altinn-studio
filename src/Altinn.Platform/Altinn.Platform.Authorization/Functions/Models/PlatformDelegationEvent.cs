using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.Functions.Models
{
    /// <summary>
    /// This is the model Altinn Bridge expects to receive an array of
    /// </summary>
    public class PlatformDelegationEvent
    {
        [JsonPropertyName("eventType")]
        public DelegationChangeEventType EventType { get; set; }

        [JsonPropertyName("policyChangeId")]
        public int PolicyChangeId { get; set; }

        [JsonPropertyName("altinnAppId")]
        public string AltinnAppId { get; set; }

        [JsonPropertyName("offeredByPartyId")]
        public int OfferedByPartyId { get; set; }

        [JsonPropertyName("coveredByPartyId")]
        public int CoveredByPartyId { get; set; }

        [JsonPropertyName("coveredByUserId")]
        public int CoveredByUserId { get; set; }

        [JsonPropertyName("performedByUserId")]
        public int PerformedByUserId { get; set; }

        [JsonPropertyName("created")]
        public DateTime Created { get; set; }
    }
}
