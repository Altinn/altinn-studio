using System;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Repository.Models
{
    /// <summary>
    /// Build document for Document db
    /// </summary>
    public class BuildDocument
    {
        /// <summary>
        /// Id
        /// </summary>
        [JsonProperty("id")]
        public string Id { get; set; }

        /// <summary>
        /// Status
        /// </summary>
        [JsonProperty("status")]
        public string Status { get; set; }

        /// <summary>
        /// Started
        /// </summary>
        [JsonProperty("started")]
        public DateTime? Started { get; set; }

        /// <summary>
        /// Finished
        /// </summary>
        [JsonProperty("finished")]
        public DateTime? Finished { get; set; }
    }
}
