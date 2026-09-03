using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Optional body of a fail request: why the caller gave up on the parked step.
/// </summary>
public sealed record FailWorkflowRequest
{
    /// <summary>Longest accepted <see cref="Reason"/>, in characters.</summary>
    public const int MaxReasonLength = 500;

    /// <summary>
    /// Recorded verbatim as the parked step's final, non-retryable error entry — the text consumers read when
    /// they ask why the step failed, so say who decided and on what grounds. At most
    /// <see cref="MaxReasonLength"/> characters; a default text is recorded when the body is omitted.
    /// </summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; init; }
}
