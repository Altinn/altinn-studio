using System;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models
{
    /// <summary>
    /// Azure DevOps Build
    /// </summary>
    public class Build
    {
        /// <summary>
        /// Build id
        /// </summary>
        [JsonProperty("id")]
        public int Id { get; set; }

        /// <summary>
        /// The time that the build was started.
        /// </summary>
        [JsonProperty("startTime")]
        public DateTime? StartTime { get; set; }

        /// <summary>
        /// The time that the build was completed.
        /// </summary>
        [JsonProperty("finishTime")]
        public DateTime? FinishTime { get; set; }

        /// <summary>
        /// The status of the build.
        /// </summary>
        [JsonProperty("status")]
        [JsonConverter(typeof(StringEnumConverter))]
        public BuildStatus Status { get; set; }

        /// <summary>
        /// The result of the build.
        /// </summary>
        [JsonProperty("result")]
        [JsonConverter(typeof(StringEnumConverter))]
        public BuildResult Result { get; set; }
    }
}
