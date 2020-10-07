using System;
using System.Text.Json.Serialization;

namespace Altinn.App.PlatformServices.Models
{
    /// <summary>
    /// Represents an event. Based on CloudEvent: https://github.com/cloudevents/spec/blob/v1.0/spec.md.
    /// </summary>
    public class CloudEvent
    {
        /// <summary>
        /// Gets or sets the id of the event.
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the source of the event.
        /// </summary>
        [JsonPropertyName("source")]
        public Uri Source { get; set; }

        /// <summary>
        /// Gets or sets the specification version of the event.
        /// </summary>
        [JsonPropertyName("specversion")]
        public string SpecVersion { get; set; }

        /// <summary>
        /// Gets or sets the type of the event.
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; }

        /// <summary>
        /// Gets or sets the subject of the event.
        /// </summary>
        [JsonPropertyName("subject")]
        public string Subject { get; set; }
    
        /// <summary>
        /// Gets or sets the time of the event.
        /// </summary>
        [JsonPropertyName("time")]
        public DateTime Time { get; set; }

        /// <summary>
        /// Gets or sets the alternative subject of the event.
        /// </summary>
        [JsonPropertyName("alternativesubject")]
        public string AlternativeSubject { get; set; }
    }
}
