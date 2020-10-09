using System;
using System.Net.Mime;
using Newtonsoft.Json;

namespace Altinn.Platform.Events.Models
{
    /// <summary>
    /// Represents a cloud event. Based on CloudEvent: https://github.com/cloudevents/spec/blob/v1.0/spec.md.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class CloudEvent
    {
        /// <summary>
        /// Gets or sets the Id of the event
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the Source of the event
        /// </summary>
        [JsonProperty(PropertyName = "source")]
        public Uri Source { get; set; }

        /// <summary>
        /// Gets or sets the Specversion of the event
        /// </summary>
        [JsonProperty(PropertyName = "specversion")]
        public string Specversion { get; set; }

        /// <summary>
        /// Gets or sets the Type of the event
        /// </summary>
        [JsonProperty(PropertyName = "type")]
        public string Type { get; set; }

        /// <summary>
        /// Gets or sets the Subject of the event
        /// </summary>
        [JsonProperty(PropertyName = "subject")]
        public string Subject { get; set; }

        /// <summary>
        /// Gets or sets the Time of the event
        /// </summary>
        [JsonProperty(PropertyName = "time")]
        public DateTime? Time { get; set; }

        /// <summary>
        /// Gets or sets the alternativesubject of the event
        /// </summary>
        [JsonProperty(PropertyName = "alternativesubject")]
        public string AlternativeSubject { get; set; }

        /// <summary>
        /// Gets or sets the cloudEvent data content. The event payload.
        /// The payload depends on the type and the dataschema.
        /// </summary>
        [JsonProperty(PropertyName = "data")]
        public object Data { get; set; }

        /// <summary>
        /// Gets or sets the cloudEvent dataschema attribute.
        /// A link to the schema that the data attribute adheres to.
        /// </summary>
        [JsonProperty(PropertyName = "dataschema")]
        public Uri DataSchema { get; set; }

        /// <summary>
        /// Gets or sets the cloudEvent datacontenttype attribute.
        /// Content type of the data attribute value.
        /// </summary>
        [JsonProperty(PropertyName = "contenttype")]
        public ContentType DataContentType { get; set; }
    }
}
