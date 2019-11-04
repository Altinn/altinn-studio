using Newtonsoft.Json;

namespace AltinnCore.Designer.Repository.Models
{
    /// <summary>
    /// Deployment entity for a db
    /// </summary>
    public class DeploymentEntity : BaseEntity
    {
        /// <summary>
        /// TagName
        /// </summary>
        [JsonProperty("tagName")]
        public string TagName { get; set; }

        /// <summary>
        /// EnvironmentName
        /// </summary>
        [JsonProperty("envName")]
        public string EnvironmentName { get; set; }

        /// <summary>
        /// Build
        /// </summary>
        [JsonProperty("build")]
        public BuildEntity Build { get; set; }
    }
}
