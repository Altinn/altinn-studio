namespace Altinn.Studio.Designer.Services.Models
{
    public class KubernetesDeployment
    {
        public string EnvName { get; set; }

        public string Release { get; set; }

        public string Version { get; set; }

        /// <summary>
        /// Gets or sets the status of the deployment.
        /// This represents the current state of the deployment in the Kubernetes cluster, such as 'Completed', 'Progressing', 'Failed', etc.
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        /// Gets or sets the status date of the deployment.
        /// </summary>
        public string StatusDate { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the resource is available.
        /// </summary>
        public bool Available { get; set; }

        /// <summary>
        /// Gets or sets the availability percentage of the deployment.
        /// This represents the percentage of pods that are up and running compared to the total number of pods in the deployment.
        /// </summary>
        public int AvailabilityPercentage { get; set; }
    }
}
