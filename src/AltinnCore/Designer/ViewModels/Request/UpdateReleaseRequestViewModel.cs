using System;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Enums;
using Newtonsoft.Json;

namespace AltinnCore.Designer.ViewModels.Request
{
    /// <summary>
    /// Viewmodel for updating a release
    /// </summary>
    public class UpdateReleaseRequestViewModel
    {
        /// <summary>
        /// Status of the build in Azure DevOps
        /// </summary>
        [JsonProperty("status")]
        public BuildStatus Status { get; set; }

        /// <summary>
        /// When the build in Azure DevOps started building
        /// </summary>
        [JsonProperty("started")]
        public DateTime? Started { get; set; }

        /// <summary>
        /// When the build in Azure DevOps has finished building
        /// </summary>
        [JsonProperty("finished")]
        public DateTime? Finished { get; set; }

        /// <summary>
        /// TargetCommitish
        /// </summary>
        [JsonProperty("target_commitish")]
        public string TargetCommitish { get; set; }
    }
}
