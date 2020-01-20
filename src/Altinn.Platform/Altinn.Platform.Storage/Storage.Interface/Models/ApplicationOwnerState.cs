using System;
using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents various fields that application owner can set. Some can be displayed to the user. Others dictate behaviour.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ApplicationOwnerState
    {
        /// <summary>
        /// Gets or sets a list of labels that the application owner can associate with the application instance.
        /// </summary>
        [JsonProperty(PropertyName = "labels")]
        public List<string> Labels { get; set; }

        /// <summary>
        /// Gets or sets a list of messages that may be shown to user.
        /// </summary>
        [JsonProperty(PropertyName = "messages")]
        public List<LanguageString> Messages { get; set; }

        /// <summary>
        /// Gets or sets the date and time for when the system can delete the instance if user chose to do so.
        /// Should only be set if application owner has downloaded the instance and its data elements and
        /// processed them successfully.
        /// </summary>
        [JsonProperty(PropertyName = "canBeDeletedAfter")]
        public DateTime? CanBeDeletedAfter { get; set; }
    }
}
