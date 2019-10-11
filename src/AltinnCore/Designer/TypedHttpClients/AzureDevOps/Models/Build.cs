using System;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Enums;
using Newtonsoft.Json;

namespace AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models
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
        /// The build number/name of the build.
        /// </summary>
        [JsonProperty("buildNumber")]
        public int BuildNumber { get; set; }

        /// <summary>
        /// The time that the build was started.
        /// </summary>
        [JsonProperty("startTime")]
        public DateTime? StartTime { get; set; }

        /// <summary>
        /// The status of the build.
        /// </summary>
        [JsonProperty("status")]
        public BuildStatus Status { get; set; }
    }
}
