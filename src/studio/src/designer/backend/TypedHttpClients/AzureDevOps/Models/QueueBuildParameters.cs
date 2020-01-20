using Newtonsoft.Json;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models
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
        /// The name of the environment the app should deploy to
        /// </summary>
        [JsonProperty("APP_ENVIRONMENT")]
        public string AppEnvironment { get; set; }

        /// <summary>
        /// The hostname where the app should deploy to
        /// </summary>
        [JsonProperty("HOSTNAME")]
        public string Hostname { get; set; }

        /// <summary>
        /// The tag for the image
        /// </summary>
        [JsonProperty("TAGNAME")]
        public string TagName { get; set; }

        /// <summary>
        /// The hostname of the altinn studio env
        /// </summary>
        [JsonProperty("ALTINN_STUDIO_HOSTNAME")]
        public string AltinnStudioHostname { get; set; }
    }
}
