#nullable enable
namespace Altinn.Studio.Designer.Scheduling;

public static class DeploymentDispatchSweeperJobConstants
{
    public const string JobName = nameof(DeploymentDispatchSweeperJob);
    public const string JobGroup = nameof(DeploymentDispatchSweeperJob);
    public const string TriggerName = nameof(DeploymentDispatchSweeperJob);
    public const string TriggerGroup = nameof(DeploymentDispatchSweeperJob);
    public const int IntervalInSeconds = 30;
    public const int BatchSize = 10;
    public const int ClaimTimeoutMinutes = 5;
}
