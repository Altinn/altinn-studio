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
        [JsonProperty("deployedInEnv")]
        public bool DeployedInEnv { get; set; }

        /// <summary>
        /// Build
        /// </summary>
        [JsonProperty("build")]
        public BuildEntity Build { get; set; }

        /// <summary>
        /// Gets or sets the status of the deployment.
        /// This represents the current state of the deployment in the Kubernetes cluster, such as 'Available', 'Progressing', 'Failed', etc.
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        /// Gets or sets the availability percentage of the deployment.
        /// This represents the percentage of pods that are up and running compared to the total number of pods in the deployment.
        /// </summary>
        public int AvailabilityPercentage { get; set; }
    }
}
