namespace WorkflowEngine.Models.Extensions;

public static class HealthStatusExtensions
{
    extension(EngineHealthStatus status)
    {
        public bool IsDisabled() => (status & EngineHealthStatus.Disabled) != 0;

        public bool IsHealthy() =>
            (status & EngineHealthStatus.Running) != 0 && (status & EngineHealthStatus.Unhealthy) == 0;

        public bool HasFullQueue() => (status & EngineHealthStatus.QueueFull) != 0;
    }
}
