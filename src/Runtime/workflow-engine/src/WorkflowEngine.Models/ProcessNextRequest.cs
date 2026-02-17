using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A request to move the process forward from one element (task) to another.
/// </summary>
public sealed record ProcessNextRequest
{
    /// <summary>
    /// The current BPMN element (task) ID.
    /// </summary>
    [JsonPropertyName("currentElementId")]
    public required string CurrentElementId { get; init; }

    /// <summary>
    /// The desired BPMN element (task) ID.
    /// </summary>
    [JsonPropertyName("desiredElementId")]
    public required string DesiredElementId { get; init; }

    /// <summary>
    /// The actor this request is executed on behalf of.
    /// </summary>
    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    // TODO: This is named 'LockKey' elsewhere, unify to one or the other
    /// <summary>
    /// The lock token associated with this process/next request
    /// </summary>
    [JsonPropertyName("lockToken")]
    public required string LockToken { get; init; }

    /// <summary>
    /// An optional start time for when the workflow should be executed.
    /// </summary>
    [JsonPropertyName("startTime")]
    public DateTimeOffset? StartAt { get; init; }

    /// <summary>
    /// Workflow steps associated with this request.
    /// </summary>
    [JsonPropertyName("steps")]
    public required IEnumerable<StepRequest> Steps { get; init; }

    /// <summary>
    /// The type of workflow.
    /// </summary>
    [JsonPropertyName("type")]
    public WorkflowType Type { get; init; } = WorkflowType.Generic;

    /// <summary>
    /// The optional parent workflow ID, for hierarchical workflow chains.
    /// </summary>
    [JsonPropertyName("parentWorkflowId")]
    public long? ParentWorkflowId { get; init; }

    /// <summary>
    /// The start mode for the workflow.
    /// </summary>
    [JsonPropertyName("startMode")]
    public WorkflowStartMode StartMode { get; init; } = WorkflowStartMode.Immediate;

    /// <summary>
    /// Converts this request to an <see cref="EngineRequest"/> with the provided instance information.
    /// </summary>
    /// <param name="instanceInformation">The instance information.</param>
    /// <param name="createdAt">The creation time of the request (eg. now).</param>
    /// <param name="traceContext">The trace context, if available.</param>
    public EngineRequest ToEngineRequest(
        InstanceInformation instanceInformation,
        DateTimeOffset createdAt,
        string? traceContext
    ) =>
        new(
            $"{instanceInformation.InstanceGuid}/next/from-{CurrentElementId}-to-{DesiredElementId}",
            "next",
            instanceInformation,
            Actor,
            createdAt,
            StartAt,
            Steps,
            traceContext,
            LockToken,
            Type,
            ParentWorkflowId,
            StartMode
        );
};
