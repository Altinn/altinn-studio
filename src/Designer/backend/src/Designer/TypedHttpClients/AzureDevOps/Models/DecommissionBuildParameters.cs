#nullable disable
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;

/// <summary>
/// Parameters for the application decommissioning build pipeline.
/// </summary>
public class DecommissionBuildParameters
{
    /// <summary>
    /// Owner of the application.
    /// </summary>
    [JsonPropertyName("APP_OWNER")]
    public string AppOwner { get; set; }

    /// <summary>
    /// Repository name of the application.
    /// </summary>
    [JsonPropertyName("APP_REPO")]
    public string AppRepo { get; set; }

    /// <summary>
    /// Gets the target environment for decommissioning.
    /// </summary>
    [JsonPropertyName("APP_ENVIRONMENT")]
    public string AppEnvironment { get; set; }

    /// <summary>
    /// The hostname of the altinn studio env
    /// </summary>
    [JsonPropertyName("ALTINN_STUDIO_HOSTNAME")]
    public string AltinnStudioHostname { get; set; }

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
    /// Whether or not to push the sync root gitops image
    /// </summary>
    [JsonPropertyName("PUSH_SYNCROOT_GITOPS_IMAGE")]
    public string PushSyncRootGitopsImage { get; set; } = "true";

    /// <summary>
    /// Whether or not to push the apps OCI image
    /// </summary>
    [JsonPropertyName("PUSH_APPS_OCI_IMAGE")]
    public string PushAppsOciImage { get; set; } = "false";
}

