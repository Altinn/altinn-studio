using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Enums;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Class representing the settings found in .altinnstudio/settings.json
    /// </summary>
    public class AltinnStudioSettings
    {
        /// <summary>
        /// The type of Altinn repository ie. if this an app or datamodels repository.
        /// </summary>
        [JsonPropertyName("repoType")]
        [JsonProperty("repoType")]
        public AltinnRepositoryType RepoType { get; set; }

        /// <summary>
        /// What kind of modelling schema that is used ie. Xsd or Json Schema.
        /// </summary>
        [JsonPropertyName("datamodelling.preference")]
        [JsonProperty("datamodelling.preference")]
        public DatamodellingPreference DatamodellingPreference { get; set; }
    }
}
