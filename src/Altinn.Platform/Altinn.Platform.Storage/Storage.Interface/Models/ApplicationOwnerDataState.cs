using System;
using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents records on when an application owner has downloaded data elements and confirmed the downloads.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ApplicationOwnerDataState
    {
        /// <summary>
        /// Gets or sets a list of dates for when the application owner has downloaded data.
        /// </summary>
        [JsonProperty(PropertyName = "downloaded")]
        public List<DateTime> Downloaded { get; set; }

        /// <summary>
        /// Gets or sets a list of dates that the application owner has confirmed a data download.
        /// </summary>
        [JsonProperty(PropertyName = "downloadConfirmed")]
        public List<DateTime> DownloadConfirmed { get; set; }
    }
}
