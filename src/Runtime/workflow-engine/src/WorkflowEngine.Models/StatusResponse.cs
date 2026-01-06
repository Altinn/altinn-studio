using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Response model for process engine status endpoint.
/// </summary>
public sealed record StatusResponse
{
    /// <summary>
    /// The overall status of the job for this instance.
    /// </summary>
    [JsonPropertyName("overallStatus")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required PersistentItemStatus OverallStatus { get; init; }

    /// <summary>
    /// Details about each task in the job.
    /// </summary>
    [JsonPropertyName("steps")]
    public required IReadOnlyList<StepDetail> Steps { get; init; }

    internal static StatusResponse FromWorkflow(Workflow workflow) =>
        new() { OverallStatus = workflow.Status, Steps = workflow.Steps.Select(StepDetail.FromStep).ToList() };
}

/// <summary>
/// Details about a process engine task.
/// </summary>
public sealed record StepDetail
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
    public required PersistentItemStatus Status { get; init; }

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

    internal static StepDetail FromStep(Step step) =>
        new()
        {
            Identifier = step.Key,
            CommandType = step.Command.GetType().Name,
            Status = step.Status,
            RetryCount = step.RequeueCount,
            BackoffUntil = step.BackoffUntil,
        };
}
