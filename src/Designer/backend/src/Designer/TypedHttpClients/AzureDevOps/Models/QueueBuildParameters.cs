#nullable disable
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models
{
    /// <summary>
    /// Parameters for build when queueing
    /// Used for calling release pipeline, deploy pipeline and gitops deployment pipeline
    /// After deploying and removing feature branch, this class should be split into multiple classes to be
    /// more explicit for each pipeline.
    /// </summary>
    public class QueueBuildParameters
    {
        /// <summary>
        /// Organisation is the app owner
        /// </summary>
        [JsonPropertyName("APP_OWNER")]
        public string AppOwner { get; set; }

        /// <summary>
        /// App is the app repo
        /// </summary>
        [JsonPropertyName("APP_REPO")]
        public string AppRepo { get; set; }

        /// <summary>
        /// The deploy token is used to let Azure DevOps pipeline clone private GITEA repos on behalf of app developer
        /// </summary>
        [JsonPropertyName("APP_DEPLOY_TOKEN")]
        public string AppDeployToken { get; set; }

        /// <summary>
        /// The URI to the correct GITEA environment based on which environment Altinn Studio is located
        /// </summary>
        [JsonPropertyName("GITEA_ENVIRONMENT")]
        public string GiteaEnvironment { get; set; }

        /// <summary>
        /// The hash connected to the commit which the build should be based on
        /// </summary>
        [JsonPropertyName("APP_COMMIT_ID")]
        public string AppCommitId { get; set; }

        /// <summary>
        /// The name of the environment the app should deploy to
        /// </summary>
        [JsonPropertyName("APP_ENVIRONMENT")]
        public string AppEnvironment { get; set; }

        /// <summary>
        /// The hostname where the app should deploy to
        /// </summary>
        [JsonPropertyName("HOSTNAME")]
        public string Hostname { get; set; }

        /// <summary>
        /// The tag for the image
        /// </summary>
        [JsonPropertyName("TAGNAME")]
        public string TagName { get; set; }

        /// <summary>
        /// The hostname of the altinn studio env
        /// </summary>
        [JsonPropertyName("ALTINN_STUDIO_HOSTNAME")]
        public string AltinnStudioHostname { get; set; }

        /// <summary>
        /// Whether or not to push the sync root gitops image
        /// </summary>
        [JsonPropertyName("PUSH_SYNCROOT_GITOPS_IMAGE")]
        public string PushSyncRootGitopsImage { get; set; } = "false";

        /// <summary>
        /// Whether or not to push the apps OCI image
        /// </summary>
        [JsonPropertyName("PUSH_APPS_OCI_IMAGE")]
        public string PushAppsOciImage { get; set; } = "true";

        /// <summary>
        /// JSON-encoded array of Maskinporten scopes for the app
        /// Format: ["scope1", "scope2"]
        /// </summary>
        [JsonPropertyName("APP_MASKINPORTEN_SCOPES")]
        public string AppMaskinportenScopes { get; set; }

        /// <summary>
        /// W3C traceparent propagated from the request that queued the deployment.
        /// </summary>
        [JsonPropertyName("TRACEPARENT")]
        public string TraceParent { get; set; }

        /// <summary>
        /// W3C tracestate propagated from the request that queued the deployment.
        /// </summary>
        [JsonPropertyName("TRACESTATE")]
        public string TraceState { get; set; }
    }
}
