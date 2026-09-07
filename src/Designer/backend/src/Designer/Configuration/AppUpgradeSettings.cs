namespace Altinn.Studio.Designer.Configuration;

/// <summary>
/// Configuration for the app upgrade engine (studioctl-server) that performs automatic app upgrades.
/// </summary>
public class AppUpgradeSettings
{
    /// <summary>
    /// Path to the Unix domain socket the upgrade engine listens on.
    /// </summary>
    public required string EngineSocketPath { get; set; }

    /// <summary>
    /// Timeout in seconds for a single upgrade run.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 900;

    public string CommitMessage { get; set; } = "Upgrade app to Altinn.App v9";

    public string BranchPrefix { get; set; } = "upgrade/altinn-app-v9-";
}
