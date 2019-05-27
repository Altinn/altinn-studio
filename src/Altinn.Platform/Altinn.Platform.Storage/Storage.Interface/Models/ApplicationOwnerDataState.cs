using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace Storage.Interface.Models
{
    public class ApplicationOwnerDataState
    {
        /// <summary>
        /// List of when the application owner has downloaded data
        /// </summary>
        [JsonProperty(PropertyName = "downloaded")]
        public List<DateTime> Downloaded { get; set; }

        /// <summary>
        /// List of time stamps when application owner has confirmed the download
        /// </summary>
        [JsonProperty(PropertyName = "downloadConfirmed")]
        public List<DateTime> DownloadConfirmed { get; set; }
    }
}
