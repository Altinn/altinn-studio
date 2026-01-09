using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Api.Constants;

/// <summary>
/// Default settings for the Process Engine.
/// </summary>
internal static class Defaults
{
    public static readonly EngineSettings EngineSettings = new()
    {
        QueueCapacity = 10000,
        DefaultTaskExecutionTimeout = TimeSpan.FromSeconds(100),
        DefaultTaskRetryStrategy = RetryStrategy.Exponential(
            baseInterval: TimeSpan.FromSeconds(1),
            maxRetries: 1000,
            maxDelay: TimeSpan.FromSeconds(60)
        ),
        DatabaseRetryStrategy = RetryStrategy.Exponential(
            baseInterval: TimeSpan.FromMilliseconds(100),
            maxRetries: 50,
            maxDelay: TimeSpan.FromSeconds(10)
        ),
    };

    public static readonly AppCommandSettings AppCommandSettings = new()
    {
        ApiKey = "injected-at-runtime",
        CommandEndpoint =
            "http://local.altinn.cloud/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/process-engine-callbacks",
    };
}
