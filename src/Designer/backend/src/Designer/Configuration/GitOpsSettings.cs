using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

/// <summary>
/// Configuration settings for GitOps functionality
/// </summary>
public class GitOpsSettings : ISettingsMarker
{
    /// <summary>
    /// Personal Access Token for GitOps bot authentication
    /// </summary>
    public string BotPersonalAccessToken { get; set; }

    /// <summary>
    /// The name of the GitOps repository
    /// </summary>
    public string GitOpsRepoNameFormat { get; set; } = "{0}-gitops";

    /// <summary>
    /// Organization where GitOps repositories are hosted
    /// </summary>
    public string GitOpsOrg { get; set; } = "als";
}
