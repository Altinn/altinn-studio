namespace Common.Models
{
    /// <summary>
    /// Model for deployment status
    /// </summary>
    public class DeploymentStatus
    {
        /// <summary>
        /// Success status
        /// </summary>
        /// <value></value>
        public bool Success { get; set; }

        /// <summary>
        /// Response status
        /// </summary>
        /// <value></value>
        public string Message { get; set; }

        /// <summary>
        /// start time
        /// </summary>
        public string StartTime { get; set; }

        /// <summary>
        /// finish time
        /// </summary>
        public string FinishTime { get; set; }

    }
}
