using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace Storage.Interface.Models
{
    /// <summary>
    /// Various fields that application owner can set. Some can be displayed to the user. Others dictate beahviour.
    /// </summary>
    public class ApplicationOwnerState
    {
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
