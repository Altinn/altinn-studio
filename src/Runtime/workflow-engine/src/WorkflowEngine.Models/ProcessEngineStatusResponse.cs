using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Response model for process engine status endpoint.
/// </summary>
public sealed record ProcessEngineStatusResponse
{
    /// <summary>
    /// The overall status of the job for this instance.
    /// </summary>
    [JsonPropertyName("overallStatus")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required ProcessEngineItemStatus OverallStatus { get; init; }

    /// <summary>
    /// Details about each task in the job.
    /// </summary>
    [JsonPropertyName("tasks")]
    public required IReadOnlyList<ProcessEngineTaskDetail> Tasks { get; init; }

    internal static ProcessEngineStatusResponse FromProcessEngineJob(ProcessEngineJob job) =>
        new()
        {
            OverallStatus = job.Status,
            Tasks = job.Tasks.Select(ProcessEngineTaskDetail.FromProcessEngineTask).ToList(),
        };
}

/// <summary>
/// Details about a process engine task.
/// </summary>
public sealed record ProcessEngineTaskDetail
{
    /// <summary>
    /// The task identifier.
    /// </summary>
    [JsonPropertyName("identifier")]
    public required string Identifier { get; init; }

    /// <summary>
    /// The command type for this task.
    /// </summary>
    [JsonPropertyName("commandType")]
    public required string CommandType { get; init; }

    /// <summary>
    /// The current status of the task.
    /// </summary>
    [JsonPropertyName("status")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required ProcessEngineItemStatus Status { get; init; }

    /// <summary>
    /// The number of times this task has been retried.
    /// </summary>
    [JsonPropertyName("retryCount")]
    public required int RetryCount { get; init; }

    /// <summary>
    /// When the task will next be eligible for execution (if backed off).
    /// </summary>
    [JsonPropertyName("backoffUntil")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? BackoffUntil { get; init; }

    internal static ProcessEngineTaskDetail FromProcessEngineTask(ProcessEngineTask task) =>
        new()
        {
            Identifier = task.Key,
            CommandType = task.Command.GetType().Name,
            Status = task.Status,
            RetryCount = task.RequeueCount,
            BackoffUntil = task.BackoffUntil,
        };
}
