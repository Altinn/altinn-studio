using System.Text.Json.Serialization;

namespace Altinn.Studio.Gateway.Contracts.Workflows;

/// <summary>
/// Body of the fail pass-through: why the caller is giving up on a parked workflow. This one field
/// is the whole vocabulary a caller can send — the gateway rebuilds the body from it before
/// forwarding — and the engine records it as the parked step's final error entry. Omitted, the
/// engine records its own default text.
/// </summary>
public sealed record FailWorkflowRequest([property: JsonPropertyName("reason")] string? Reason)
{
    /// <summary>Longest accepted reason, in characters. Mirrors the engine's own limit.</summary>
    public const int MaxReasonLength = 500;
}
