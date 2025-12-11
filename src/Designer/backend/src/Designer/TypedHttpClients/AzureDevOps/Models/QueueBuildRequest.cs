#nullable disable
using System.Text.Json.Serialization;

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
        [JsonPropertyName("definition")]
        public DefinitionReference DefinitionReference { get; set; }

        /// <summary>
        /// The parameters for the build
        /// </summary>
        [JsonPropertyName("parameters")]
        public string Parameters { get; set; }

        /// <summary>
        /// The source branch to build from (e.g., refs/heads/main)
        /// </summary>
        [JsonPropertyName("sourceBranch")]
        public string SourceBranch { get; set; } = "refs/heads/temp/syncroot-staging";
    }
}
