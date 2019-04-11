namespace Common.Models
{
    /// <summary>
    /// Model for deployment status
    /// </summary>
    public class DeploymentStatus : DeploymentResponse
    {
        /// <summary>
        /// Build status
        /// </summary>
        public string Status { get; set; }

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
