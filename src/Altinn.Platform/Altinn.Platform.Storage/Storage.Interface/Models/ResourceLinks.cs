using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace Storage.Interface.Models
{
    /// <summary>
    /// represent actual links to resources in various enpoints
    /// </summary>
    public class ResourceLinks
    {
        /// <summary>
        /// application resource link
        /// </summary>
        [JsonProperty(PropertyName = "apps")]
        public string Apps { get; set; }

        /// <summary>
        /// platform resource link
        /// </summary>
        [JsonProperty(PropertyName = "platform")]
        public string Platform { get; set; }
    }
}
