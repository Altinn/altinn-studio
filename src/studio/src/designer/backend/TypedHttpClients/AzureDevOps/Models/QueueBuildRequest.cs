using Newtonsoft.Json;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models
{
    /// <summary>
    /// Request model for queuing a build
    /// </summary>
    public class QueueBuildRequest
    {
        /// <summary>
        /// The definition associated with the build.
        /// </summary>
        [JsonProperty("definition")]
        public DefinitionReference DefinitionReference { get; set; }

        /// <summary>
        /// The parameters for the build
        /// </summary>
        [JsonProperty("parameters")]
        public string Parameters { get; set; }
    }
}
