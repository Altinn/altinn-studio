using Newtonsoft.Json;

namespace AltinnCore.Designer.ViewModels.Request
{
    /// <summary>
    /// Azure DevOps Web hook event model
    /// </summary>
    public class AzureDevOpsWebHookEventModel
    {
        /// <summary>
        /// Model that 
        /// </summary>
        public AzureDevOpsResource Resource { get; set; }
    }

    /// <summary>
    /// Internal class only used for building up an AzureDevOpsWebHookEventModel
    /// </summary>
    public class AzureDevOpsResource
    {
        /// <summary>
        /// Build number
        /// </summary>
        [JsonProperty("buildNumber")]
        public string BuildNumber { get; set; }
    }
}
