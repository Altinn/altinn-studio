using System;
using Newtonsoft.Json;

namespace Altinn.Platform.Events.Models
{
    /// <summary>
    /// Class describing a CloudEvent
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
        public string Alternativesubject { get; set; }
    }
}
