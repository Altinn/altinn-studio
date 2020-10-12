using System;
using System.Net.Mime;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Events.Models
{
    /// <summary>
    /// Represents a cloud event. Based on CloudEvent: https://github.com/cloudevents/spec/blob/v1.0/spec.md.
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

        /// <summary>
        /// Gets or sets the cloudEvent data content. The event payload.
        /// The payload depends on the type and the dataschema.
        /// </summary>
        [JsonPropertyName("data")]
        public object Data { get; set; }

        /// <summary>
        /// Gets or sets the cloudEvent dataschema attribute.
        /// A link to the schema that the data attribute adheres to.
        /// </summary>
        [JsonPropertyName("dataschema")]
        public Uri DataSchema { get; set; }

        /// <summary>
        /// Gets or sets the cloudEvent datacontenttype attribute.
        /// Content type of the data attribute value.
        /// </summary>
        [JsonPropertyName("contenttype")]
        public ContentType DataContentType { get; set; }
    }
}
