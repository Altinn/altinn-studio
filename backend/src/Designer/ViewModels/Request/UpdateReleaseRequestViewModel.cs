using System;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.ViewModels.Request
{
    /// <summary>
    /// Viewmodel for updating a release
    /// </summary>
    public class UpdateReleaseRequestViewModel
    {
        /// <summary>
        /// Id
        /// </summary>
        [JsonProperty("id")]
        public string Id { get; set; }

        /// <summary>
        /// Status of the build in Azure DevOps
        /// </summary>
        [JsonProperty("status")]
        public BuildStatus Status { get; set; }

        /// <summary>
        /// Result of the build in Azure DevOps
        /// </summary>
        [JsonProperty("result")]
        public BuildResult Result { get; set; }

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
    }
}
