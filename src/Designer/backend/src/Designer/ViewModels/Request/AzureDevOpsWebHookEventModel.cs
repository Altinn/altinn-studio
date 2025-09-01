using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.ViewModels.Request
{
    /// <summary>
    /// Azure DevOps Web hook event model
    /// </summary>
    public class AzureDevOpsWebHookEventModel
    {
        /// <summary>
        /// Model that 
        /// </summary>
        [Required(ErrorMessage = "Resource property can not be null")]
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
        [Required(ErrorMessage = "buildNumber property can not be null, empty string or containing only whitespace")]
        [JsonProperty("buildNumber")]
        public string BuildNumber { get; set; }

        /// <summary>
        /// Application owner
        /// </summary>
        [JsonProperty("resourceOwner")]
        public string ResourceOwner { get; set; }
    }
}
