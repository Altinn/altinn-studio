using System.Text.Json.Serialization;

namespace Altinn.Platform.Authorization.Functions.Models
{
    public class DelegationChangeEvent
    {
        [JsonPropertyName("e")]
        public DelegationChangeEventType EventType { get; set; }
        [JsonPropertyName("d")]
        public DelegationChange DelegationChange { get; set; }
    }
}
