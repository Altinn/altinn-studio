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
}
