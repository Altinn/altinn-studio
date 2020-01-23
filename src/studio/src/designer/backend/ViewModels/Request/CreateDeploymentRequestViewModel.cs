using System.ComponentModel.DataAnnotations;
using Altinn.Studio.Designer.Services.Models;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.ViewModels.Request
{
    /// <summary>
    /// Viewmodel for creating a deployment
    /// </summary>
    public class CreateDeploymentRequestViewModel
    {
        /// <summary>
        /// TagName
        /// </summary>
        [Required]
        [JsonProperty("tagName")]
        public string TagName { get; set; }

        /// <summary>
        /// Environment
        /// </summary>
        [Required]
        [JsonProperty("env")]
        public EnvironmentModel Environment { get; set; }
    }
}
