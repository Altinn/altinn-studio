using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

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
        [JsonProperty("appsUrl")]
        public string AppsUrl { get; set; }

        /// <summary>
        /// PlatformUrl
        /// </summary>
        [Required]
        [JsonProperty("platformUrl")]
        public string PlatformUrl { get; set; }

        /// <summary>
        /// Hostname
        /// </summary>
        [JsonProperty("hostname")]
        public string Hostname { get; set; }

        /// <summary>
        /// App prefix
        /// </summary>
        [JsonProperty("appPrefix")]
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
