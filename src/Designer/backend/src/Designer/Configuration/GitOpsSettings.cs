#nullable disable
using System.IO;
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

    /// <summary>
    /// Directory for the local clones of the GitOps repositories. It should be on local disk rather than the shared
    /// repository volume, since every deploy checks each file in the clone, and that is slow over the network. The
    /// cleanup of inactive repositories does not look here, so it cannot delete a clone that a deploy is using.
    /// </summary>
    public string LocalRepositoryLocation { get; set; } = Path.Join(Path.GetTempPath(), "gitops");
}
