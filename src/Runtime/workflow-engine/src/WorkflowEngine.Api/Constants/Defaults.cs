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
        MaxDegreeOfParallelism = 100,
        MaxConcurrentDbOperations = 90,
        MaxConcurrentHttpCalls = 500,
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

    public static readonly AppCommandSettings AppCommandSettings = new()
    {
        ApiKey = "injected-at-runtime",
        CommandEndpoint =
            "http://local.altinn.cloud/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/process-engine-callbacks",
    };
}
