namespace AltinnCore.Designer.Services.Models
{
    /// <summary>
    /// Domain model for Deployment
    /// </summary>
    public class DeploymentModel
    {
        /// <summary>
        /// TagName
        /// </summary>
        public string TagName { get; set; }

        /// <summary>
        /// Environment model
        /// </summary>
        public EnvironmentModel Environment { get; set; }
    }
}
