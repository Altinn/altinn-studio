namespace Altinn.App.ProcessEngine.Extensions;

// TODO: Definitely write some tests for these guys
internal static class ProcessEngineHealthStatusExtensions
{
    public static bool IsDisabled(this ProcessEngineHealthStatus status) =>
        (status & ProcessEngineHealthStatus.Disabled) != 0;

    public static bool IsHealthy(this ProcessEngineHealthStatus status) =>
        (status & ProcessEngineHealthStatus.Running) != 0 && (status & ProcessEngineHealthStatus.Unhealthy) == 0;

    public static bool HasFullQueue(this ProcessEngineHealthStatus status) =>
        (status & ProcessEngineHealthStatus.QueueFull) != 0;
}
