namespace Altinn.Studio.Designer.Services.Models
{
    public class KubernetesDeployment
    {
        public string Release { get; set; }

        public string Version { get; set; }

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
