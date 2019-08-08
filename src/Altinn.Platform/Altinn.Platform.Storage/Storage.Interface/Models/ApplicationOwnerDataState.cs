using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace Storage.Interface.Models
{
    /// <summary>
    /// Model to hold application owner state for a specific data element
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ApplicationOwnerDataState
    {
        /// <summary>
        /// List of date-timestamps for when the application owner has downloaded data
        /// </summary>
        [JsonProperty(PropertyName = "downloaded")]
        public List<DateTime> Downloaded { get; set; }

        /// <summary>
        /// List of date-timestamps when application owner has confirmed the download
        /// </summary>
        [JsonProperty(PropertyName = "downloadConfirmed")]
        public List<DateTime> DownloadConfirmed { get; set; }
    }
}
