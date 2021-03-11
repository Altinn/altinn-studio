using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;

namespace Altinn.EFormidlingClient.Models
{
    /// <summary>
    /// Initializes a new instance of the <see cref="Subscribe"/> class.
    /// </summary>
    public class CreateSubscription
    {
        /// <summary>
        ///  Gets or sets the Name
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; }

        /// <summary>
        ///  Gets or sets the PushEndpoint
        /// </summary>
        [JsonPropertyName("pushEndpoint")]
        public string PushEndpoint { get; set; }

        /// <summary>
        ///  Gets or sets the Resource
        /// </summary>
        [JsonPropertyName("resource")]
        public string Resource { get; set; }

        /// <summary>
        ///  Gets or sets the Event
        /// </summary>
        [JsonPropertyName("event")]
        public string Event { get; set; }

        /// <summary>
        ///  Gets or sets the Event
        /// </summary>
        [JsonPropertyName("filter")]
        public string Filter { get; set; }
    }
}
