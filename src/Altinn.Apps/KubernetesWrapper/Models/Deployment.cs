namespace KubernetesWrapper.Models
{
    /// <summary>
    /// Class describing a deployment
    /// </summary>
    public class Deployment
    {
        /// <summary>
        /// Gets or sets the version of the deployment, the image tag number
        /// </summary>
        public string Version { get; set; }

        /// <summary>
        /// Gets or sets release name
        /// </summary>
        public string Release { get; set; }
    }
}
