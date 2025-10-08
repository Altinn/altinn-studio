using Newtonsoft.Json;
using System.Text.Json.Serialization;

namespace Authorization.Interface.Models
{
    /// <summary>
    /// Entity representing a Role
    /// </summary>
    [Serializable]
    public class Role
    {
        /// <summary>
        /// Gets or sets the role type
        /// </summary>
        [JsonProperty]
        [JsonPropertyName("type")]
        public string Type { get; set; }

        /// <summary>
        /// Gets or sets the role
        /// </summary>
        [JsonProperty]
        [JsonPropertyName("value")]
        public string Value { get; set; }
    }
}
