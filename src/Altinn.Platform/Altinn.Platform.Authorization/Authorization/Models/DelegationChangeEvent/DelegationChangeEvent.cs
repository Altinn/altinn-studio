using System.Text.Json.Serialization;

namespace Altinn.Platform.Authorization.Models.DelegationChangeEvent
{
    /// <summary>
    /// Internal model for a delegation change event used between Altinn.Platform.Authorization and this function app
    /// </summary>
    public class DelegationChangeEvent
    {
        /// <summary>
        /// Gets or sets the type of the event.
        /// </summary>
        /// <value>
        /// The type of the event.
        /// </value>
        [JsonPropertyName("e")]
        public DelegationChangeEventType EventType { get; set; }

        /// <summary>
        /// Gets or sets the delegation change.
        /// </summary>
        /// <value>
        /// The delegation change.
        /// </value>
        [JsonPropertyName("d")]
        public SimpleDelegationChange DelegationChange { get; set; }
    }
}
