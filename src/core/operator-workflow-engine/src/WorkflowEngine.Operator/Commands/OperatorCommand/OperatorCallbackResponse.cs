using System.Text.Json.Serialization;

namespace WorkflowEngine.Operator.Commands.OperatorCommand;

/// <summary>
/// Response body from a successful operator callback.
/// </summary>
internal sealed record OperatorCallbackResponse
{
    /// <summary>
    /// State for the next step, or for this step's next check when it defers.
    /// </summary>
    [JsonPropertyName("state")]
    public string? State { get; init; }

    /// <summary>
    /// Present when the step ran without error but what it waits for has not happened yet. Its presence is what
    /// classifies the callback as a deferral rather than a completion.
    /// </summary>
    [JsonPropertyName("defer")]
    public OperatorCallbackDeferral? Defer { get; init; }
}

/// <summary>
/// A request from the operator to run the step again later.
/// </summary>
internal sealed record OperatorCallbackDeferral
{
    /// <summary>
    /// How long to wait before the next check. This deferral only; the step's wait budget caps the total.
    /// </summary>
    [JsonPropertyName("delay")]
    public TimeSpan Delay { get; init; }

    /// <summary>
    /// What the step waits for, such as <c>queued</c>. The engine shows it on the step as its last defer reason.
    /// </summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; init; }
}
