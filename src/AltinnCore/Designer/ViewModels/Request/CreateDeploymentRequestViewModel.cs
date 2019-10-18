using AltinnCore.Designer.Services.Models;
using Newtonsoft.Json;

namespace AltinnCore.Designer.ViewModels.Request
{
    /// <summary>
    /// Viewmodel for creating a deployment
    /// </summary>
    public class CreateDeploymentRequestViewModel
    {
        /// <summary>
        /// TagName
        /// </summary>
        [JsonProperty("tagName")]
        public string TagName { get; set; }

        /// <summary>
        /// Environment
        /// </summary>
        [JsonProperty("env")]
        public EnvironmentModel Environment { get; set; }
    }
}
