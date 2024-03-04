using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

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
        public KubernetesDeploymentStatus Status { get; set; }

        /// <summary>
        /// Gets or sets the status date of the deployment.
        /// </summary>
        public string StatusDate { get; set; }
    }
}
