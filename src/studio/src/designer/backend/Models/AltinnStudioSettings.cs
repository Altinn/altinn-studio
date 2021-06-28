using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Class representing the settings found in .altinnstudio/settings.json
    /// </summary>
    public class AltinnStudioSettings
    {
        /// <summary>
        /// The type of Altinn repository.
        /// </summary>
        [JsonPropertyName("repoType")]
        public string RepoType { get; set; }
    }
}
