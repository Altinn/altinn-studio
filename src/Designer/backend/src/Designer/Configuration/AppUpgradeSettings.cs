namespace Altinn.Studio.Designer.Configuration;

/// <summary>
/// Configuration for automatic app upgrades, which run as Gitea Actions workflows in the app repository.
/// </summary>
public class AppUpgradeSettings
{
    public string CommitMessage { get; set; } = "Upgrade app to Altinn.App v9";

    public string BranchPrefix { get; set; } = "upgrade/altinn-app-v9-";

    public string WorkflowPath { get; set; } = ".gitea/workflows/altinn-studio-upgrade.yaml";

    public string StudioctlInstallUrl { get; set; } = "https://altinn.studio/designer/api/v1/studioctl/install.sh";

    /// <summary>
    /// How long to wait for a runner to pick up the workflow before the upgrade is reported as failed.
    /// </summary>
    public int RunnerPickupTimeoutMinutes { get; set; } = 15;
}
