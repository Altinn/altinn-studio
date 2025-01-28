using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models
{
    /// <summary>
    /// Represents a reference to a definition.
    /// </summary>
    public class DefinitionReference
    {
        /// <summary>
        /// The ID of the referenced definition
        /// </summary>
        [JsonPropertyName("id")]
        public int Id { get; set; }
    }
}
