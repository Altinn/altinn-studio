namespace WorkflowEngine.Models;

/// <summary>
/// Settings for the Process Engine.
/// </summary>
public sealed record ProcessEngineSettings
{
    /// <summary>
    /// The API key used to authenticate requests from the App to the Process Engine and from the Process Engine back to the App.
    /// </summary>
    public string ApiKey { get; set; } = Defaults.ApiKey;

    /// <summary>
    /// The total number of concurrent tasks that can be processed by the engine.
    /// </summary>
    public int QueueCapacity { get; set; } = Defaults.QueueCapacity;

    /// <summary>
    /// The default timeout for task execution.
    /// </summary>
    public TimeSpan DefaultTaskExecutionTimeout { get; set; } = Defaults.DefaultTaskExecutionTimeout;

    /// <summary>
    /// The default retry strategy for tasks.
    /// </summary>
    public ProcessEngineRetryStrategy DefaultTaskRetryStrategy { get; set; } = Defaults.DefaultTaskRetryStrategy;

    /// <summary>
    /// The retry strategy for database operations.
    /// </summary>
    public ProcessEngineRetryStrategy DatabaseRetryStrategy { get; set; } = Defaults.DefaultDatabaseRetryStrategy;

    /// <summary>
    /// The full endpoint URL for application callbacks. String template supports all properties from <see cref="InstanceInformation"/>.
    /// </summary>
    public string AppCommandEndpoint { get; set; } =
        "http://local.altinn.cloud/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/process-engine-callbacks";
}
