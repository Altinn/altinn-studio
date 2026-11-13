using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

/// <summary>
/// Which Gitea team grants access to the platform-wide admin pages, which show every service owner's apps.
/// </summary>
public class StudioPlatformAccessSettings : ISettingsMarker
{
    /// <summary>
    /// The Gitea organization that owns the team.
    /// </summary>
    public string Org { get; set; } = "ttd";

    /// <summary>
    /// The team whose members get platform access. The team needs no repository access.
    /// </summary>
    public string Team { get; set; } = "Studio-Platform";
}
