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

        public DeploymentType DeploymentType { get; set; } = DeploymentType.Deploy;

        /// <summary>
        /// Build
        /// </summary>
        [JsonProperty("build")]
        public BuildEntity Build { get; set; }
    }

    public enum DeploymentType
    {
        Deploy = 0,
        Decommission = 1
    }
}
