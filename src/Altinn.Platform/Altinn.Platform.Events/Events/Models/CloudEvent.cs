using System;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Events.Models
{
    /// <summary>
    /// Class describing a CloudEvent
    /// </summary>
    public class CloudEvent
    {
        /// <summary>
        /// Gets or sets the Id of the event
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the Source of the event
        /// </summary>
        [JsonPropertyName("source")]
        public Uri Source { get; set; }

        /// <summary>
        /// Gets or sets the Specversion of the event
        /// </summary>
        [JsonPropertyName("specversion")]
        public string Specversion { get; set; }

        /// <summary>
        /// Gets or sets the Type of the event
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; }

        /// <summary>
        /// Gets or sets the Subject of the event
        /// </summary>
        [JsonPropertyName("subject")]
        public string Subject { get; set; }

        /// <summary>
        /// Gets or sets the Subject of the event
        /// </summary>
        [JsonPropertyName("data")]
        public string Data { get; set; }

        /// <summary>
        /// Gets or sets the Time of the event
        /// </summary>
        [JsonPropertyName("time")]
        public DateTime Time { get; set; }

        /// <summary>
        /// Gets or sets the alternativesubject of the event
        /// </summary>
        [JsonPropertyName("alternativesubject")]
        public string Alternativesubject { get; set; }
    }
}
