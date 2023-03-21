using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Repository.Models
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
        /// Environment Name
        /// </summary>
        [JsonProperty("envName")]
        public string EnvName { get; set; }

        /// <summary>
        /// Application found in environment
        /// </summary>
        [JsonProperty("deployed")]
        public bool Deployed { get; set; }

        /// <summary>
        /// Application found in environment
        /// </summary>
        [JsonProperty("reachable")]
        public bool Reachable { get; set; }

        /// <summary>
        /// Build
        /// </summary>
        [JsonProperty("build")]
        public BuildEntity Build { get; set; }
    }
}
