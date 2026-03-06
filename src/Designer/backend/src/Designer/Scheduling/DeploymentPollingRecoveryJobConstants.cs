#nullable enable
namespace Altinn.Studio.Designer.Scheduling;

public static class DeploymentPollingRecoveryJobConstants
{
    public const string JobName = nameof(DeploymentPollingRecoveryJob);
    public const string JobGroup = nameof(DeploymentPollingRecoveryJob);
    public const string TriggerName = nameof(DeploymentPollingRecoveryJob);
    public const string TriggerGroup = nameof(DeploymentPollingRecoveryJob);
    public const int IntervalInSeconds = 30;
    public const int BatchSize = 25;
}
