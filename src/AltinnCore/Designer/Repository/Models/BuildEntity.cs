using System;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Enums;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace AltinnCore.Designer.Repository.Models
{
    /// <summary>
    /// Build entity for a db
    /// </summary>
    public class BuildEntity
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
        [JsonConverter(typeof(StringEnumConverter))]
        public BuildStatus Status { get; set; }

        /// <summary>
        /// Result
        /// </summary>
        [JsonProperty("result")]
        [JsonConverter(typeof(StringEnumConverter))]
        public BuildResult Result { get; set; }

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
