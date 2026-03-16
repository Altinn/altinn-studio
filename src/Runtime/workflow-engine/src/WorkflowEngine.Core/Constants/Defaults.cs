using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Core.Constants;

/// <summary>
/// Default settings for the Process Engine.
/// </summary>
internal static class Defaults
{
    public static readonly EngineSettings EngineSettings = new()
    {
        MaxWorkers = 400,
        MaxConcurrentHttpCalls = 400,
        MaxConcurrentDbOperations = 90,
        MaxWorkflowsPerRequest = 100,
        MaxStepsPerWorkflow = 50,
        MaxLabels = 50,
        DefaultStepCommandTimeout = TimeSpan.FromSeconds(100),
        DefaultStepRetryStrategy = RetryStrategy.Exponential(
            baseInterval: TimeSpan.FromSeconds(1),
            maxDelay: TimeSpan.FromMinutes(5),
            maxDuration: TimeSpan.FromDays(1)
        ),
        DatabaseCommandTimeout = TimeSpan.FromSeconds(30),
        DatabaseRetryStrategy = RetryStrategy.Exponential(
            baseInterval: TimeSpan.FromMilliseconds(100),
            maxDelay: TimeSpan.FromMinutes(2)
        ),
    };
}
