using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Events.Functions.Models.Payloads
{
    /// <summary>
    /// Represents a model for sending to Slack.
    /// </summary>
    public class SlackEnvelope
    {
        /// <summary>
        /// Gets or sets the cloudevent as string.
        /// </summary>
        [JsonPropertyName("text")]
        public string CloudEvent { get; set; }

        /// <summary>
        /// Serializes the SlackEnvelope to a JSON string.
        /// </summary>
        /// <returns>Serialized slack envelope</returns>
        public string Serialize()
        {
            return JsonSerializer.Serialize(this, new JsonSerializerOptions { IgnoreNullValues = true });
        }
    }
}
