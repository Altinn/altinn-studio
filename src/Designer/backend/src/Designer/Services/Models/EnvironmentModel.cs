using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Services.Models
{
    /// <summary>
    /// Environment model
    /// </summary>
    public class EnvironmentModel
    {
        /// <summary>
        /// AppsUrl
        /// </summary>
        [Required]
        [JsonPropertyName("appsUrl")]
        public string AppsUrl { get; set; }

        /// <summary>
        /// PlatformUrl
        /// </summary>
        [Required]
        [JsonPropertyName("platformUrl")]
        public string PlatformUrl { get; set; }

        /// <summary>
        /// Hostname
        /// </summary>
        [JsonPropertyName("hostname")]
        public string Hostname { get; set; }

        /// <summary>
        /// App prefix
        /// </summary>
        [JsonPropertyName("appPrefix")]
        public string AppPrefix { get; set; }

        /// <summary>
        /// Platform prefix
        /// </summary>
        [JsonPropertyName("platformPrefix")]
        public string PlatformPrefix { get; set; }

        /// <summary>
        /// Name
        /// </summary>
        [Required]
        [JsonPropertyName("name")]
        public string Name { get; set; }

        /// <summary>
        /// Type
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; }
    }
}
