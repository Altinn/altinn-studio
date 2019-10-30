using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Abstract supertype for holding change attributes.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public abstract class ChangableElement
    {
        /// <summary>
        /// create date and time for the instance.
        /// </summary>
        [JsonProperty(PropertyName = "created")]
        public DateTime Created { get; set; }

        /// <summary>
        /// user id of the user who created the instance.
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// last changed date time for the instance.
        /// </summary>
        [JsonProperty(PropertyName = "lastChanged")]
        public DateTime? LastChanged { get; set; }

        /// <summary>
        /// user id of the user who last changed the instance.
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }

    }
}
