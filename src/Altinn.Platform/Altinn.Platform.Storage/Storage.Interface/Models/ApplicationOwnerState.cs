using Newtonsoft.Json;
using System;
using System.Collections.Generic;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Various fields that application owner can set. Some can be displayed to the user. Others dictate beahviour.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ApplicationOwnerState
    {
        /// <summary>
        /// Label mechanism, can be used to set external system references
        /// </summary>
        [JsonProperty(PropertyName = "labels")]
        public List<string> Labels { get; set; }

        /// <summary>
        /// List of messages that may be shown to user.
        /// </summary>
        [JsonProperty(PropertyName = "messages")]
        public List<LanguageString> Messages { get; set; }

        /// <summary>
        /// The date and time for when the system can delete the instance if user chose to do so.
        /// Should only be set if application owner has downloaded the instance and its data elements and
        /// processed them successfully.
        /// </summary>
        [JsonProperty(PropertyName = "canBeDeletedAfter")]
        public DateTime? CanBeDeletedAfter { get; set; }
    }
}
