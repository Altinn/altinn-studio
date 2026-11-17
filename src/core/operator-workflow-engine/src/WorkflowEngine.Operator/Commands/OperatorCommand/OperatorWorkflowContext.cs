using System.Text.Json.Serialization;

namespace WorkflowEngine.Operator.Commands.OperatorCommand;

/// <summary>
/// Workflow.Context shape for operator commands: what the workflow works on, set by the operator at enqueue.
/// </summary>
internal sealed record OperatorWorkflowContext
{
    /// <summary>
    /// The group of operator handlers the workflow belongs to, such as <c>runs</c>.
    /// </summary>
    [JsonPropertyName("domain")]
    public required string Domain { get; init; }

    /// <summary>
    /// The caller id the operator mapped the requesting ServiceAccount to, such as <c>assistant</c>.
    /// </summary>
    [JsonPropertyName("caller")]
    public required string Caller { get; init; }

    /// <summary>
    /// The id of the object the workflow works on within its domain, such as a run id.
    /// </summary>
    [JsonPropertyName("subjectId")]
    public required string SubjectId { get; init; }
}
