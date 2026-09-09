using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Optional body of a skip request: why the operator wrote the workflow off.
/// </summary>
public sealed record SkipWorkflowRequest
{
    /// <summary>Longest accepted <see cref="Reason"/>, in characters.</summary>
    public const int MaxReasonLength = 500;

    /// <summary>
    /// Recorded as <see cref="Step.SkipReason"/> on the first step that did not complete — the text consumers
    /// read when they ask why the workflow was skipped, so say who decided and on what grounds. At most
    /// <see cref="MaxReasonLength"/> characters. An omitted, null or whitespace-only reason records nothing:
    /// unlike a command's skip, an operator's skip may carry no reason at all.
    /// </summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; init; }
}
