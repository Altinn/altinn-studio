using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Extensions;

// TODO: Definitely write some tests for these guys
internal static class WorkflowEngineHealthStatusExtensions
{
    extension(EngineHealthStatus status)
    {
        public bool IsDisabled() => (status & EngineHealthStatus.Disabled) != 0;

        public bool IsHealthy() =>
            (status & EngineHealthStatus.Running) != 0 && (status & EngineHealthStatus.Unhealthy) == 0;

        public bool HasFullQueue() => (status & EngineHealthStatus.QueueFull) != 0;
    }
}
