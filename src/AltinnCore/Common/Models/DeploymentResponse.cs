namespace Common.Models
{
    /// <summary>
    /// Deployment response
    /// </summary>
    public class DeploymentResponse
    {
        /// <summary>
        /// Success status
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Response status
        /// </summary>
        public string Message { get; set; }

        /// <summary>
        /// The build id for the deployment build
        /// </summary>
        public string BuildId { get; set; }
    }
}
