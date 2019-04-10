namespace Common.Models
{
    /// <summary>
    /// Model for deployment responses
    /// </summary>
    public class DeploymentResponse
    {
        /// <summary>
        /// Success status
        /// </summary>
        /// <value></value>
        public bool Success { get; set; }

        /// <summary>
        /// Response message
        /// </summary>
        /// <value></value>
        public string Message { get; set; }

        /// <summary>
        /// The build id
        /// </summary>
        /// <value></value>
        public string BuildId { get; set; }


    }
}
