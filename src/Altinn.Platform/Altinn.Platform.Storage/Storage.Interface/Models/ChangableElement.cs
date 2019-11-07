using Newtonsoft.Json;
using System;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Abstract supertype for holding change attributes.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public abstract class ChangableElement
    {
        /// <summary>
        /// Creation time for the element.
        /// </summary>
        [JsonProperty(PropertyName = "created")]
        public DateTime? Created { get; set; }

        /// <summary>
        /// User id of the user who created it.
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// Last changed date/time for the element.
        /// </summary>
        [JsonProperty(PropertyName = "lastChanged")]
        public DateTime? LastChanged { get; set; }

        /// <summary>
        /// User id of the user who last changed it.
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }

    }
}
