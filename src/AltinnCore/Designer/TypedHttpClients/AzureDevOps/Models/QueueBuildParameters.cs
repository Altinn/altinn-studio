using Newtonsoft.Json;

namespace AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models
{
    /// <summary>
    /// Parameters for build when queueing
    /// </summary>
    public class QueueBuildParameters
    {
        /// <summary>
        /// Organisation is the app owner
        /// </summary>
        [JsonProperty("APP_OWNER")]
        public string AppOwner { get; set; }

        /// <summary>
        /// App is the app repo
        /// </summary>
        [JsonProperty("APP_REPO")]

        public string AppRepo { get; set; }

        /// <summary>
        /// The deploy token is used to let Azure DevOps pipeline clone private GITEA repos on behalf of app developer
        /// </summary>
        [JsonProperty("APP_DEPLOY_TOKEN")]
        public string AppDeployToken { get; set; }

        /// <summary>
        /// The URI to the correct GITEA environment based on which environment Altinn Studio is located
        /// </summary>
        [JsonProperty("GITEA_ENVIRONMENT")]
        public string GiteaEnvironment { get; set; }

        /// <summary>
        /// The hash connected to the commit which the build should be based on
        /// </summary>
        [JsonProperty("APP_COMMIT_ID")]
        public string AppCommitId { get; set; }

        /// <summary>
        /// Whether or not the build should deploy after finishing
        /// </summary>
        [JsonProperty("should_deploy")]
        public bool ShouldDeploy { get; set; }

        /// <summary>
        /// Whether or not it should trigger a build
        /// </summary>
        [JsonProperty("should_build")]
        public bool ShouldBuild { get; set; } = true;
    }
}
