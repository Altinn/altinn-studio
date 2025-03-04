namespace Altinn.Studio.Designer.EventHandlers.DeploymentPipelineCompleted;

public class StudioStatisticsEvent
{
    public string Name { get; private set; }
    public string Description { get; private set; }
    private StudioStatisticsEvent(string name, string description)
    {
        Name = name;
        Description = description;
    }

    public static StudioStatisticsEvent AppDeployed { get; } = new("AppDeployed", "App deployed");
    public static StudioStatisticsEvent AppUpdated { get; } = new("AppUpdated", "App updated");
    public static StudioStatisticsEvent AppDecommissioned { get; } = new("AppDecommissioned", "App Decommissioned");
    public static StudioStatisticsEvent AppDeployFailed { get; } = new("AppDeployFailed", "App deploy failed");
    public static StudioStatisticsEvent AppUpdateFailed { get; } = new("AppUpdateFailed", "App update failed");
    public static StudioStatisticsEvent AppDecommissionFailed { get; } = new("AppDecommissionFailed", "App decommission failed");
}
