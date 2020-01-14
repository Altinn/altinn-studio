using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Services.Models
{
    /// <summary>
    /// Environment model
    /// </summary>
    public class EnvironmentModel
    {
        /// <summary>
        /// Hostname
        /// </summary>
        [Required]
        [JsonProperty("hostname")]
        public string Hostname { get; set; }

        /// <summary>
        /// App prefix
        /// </summary>
        [JsonProperty("app")]
        public string AppPrefix { get; set; }

        /// <summary>
        /// Platform prefix
        /// </summary>
        [JsonProperty("platformPrefix")]
        public string PlatformPrefix { get; set; }

        /// <summary>
        /// Name
        /// </summary>
        [Required]
        [JsonProperty("name")]
        public string Name { get; set; }

        /// <summary>
        /// Type
        /// </summary>
        [JsonProperty("type")]
        public string Type { get; set; }
    }
}
