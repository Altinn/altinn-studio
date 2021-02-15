using System;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents a super type for other classes that need properties associated with creation and editing.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public abstract class ChangableElement
    {
        /// <summary>
        /// Gets or sets the date and time for when the element was created.
        /// </summary>
        [JsonProperty(PropertyName = "created")]
        public DateTime? Created { get; set; }

        /// <summary>
        /// Gets or sets the id of the user who created this element.
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// Gets or sets the date and time for when the element was last edited.
        /// </summary>
        [JsonProperty(PropertyName = "lastChanged")]
        public DateTime? LastChanged { get; set; }

        /// <summary>
        /// Gets or sets the id of the user who last changed this element.
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }
    }
}
