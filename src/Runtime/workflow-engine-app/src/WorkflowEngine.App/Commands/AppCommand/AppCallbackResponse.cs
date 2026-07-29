using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Response body from a successful Altinn app callback.
/// </summary>
internal sealed record AppCallbackResponse
{
    [JsonPropertyName("state")]
    public string? State { get; init; }

    /// <summary>
    /// Present when the command ran without error but the outcome it awaits is not available yet. Its
    /// presence is what classifies the callback as a deferral rather than a completion.
    /// </summary>
    [JsonPropertyName("defer")]
    public AppCallbackDeferral? Defer { get; init; }
}

/// <summary>
/// A request from the app to be re-executed later, because what it is waiting for has not happened yet.
/// </summary>
internal sealed record AppCallbackDeferral
{
    /// <summary>
    /// How long to wait before executing the command again. This deferral only; the wait budget caps the total.
    /// </summary>
    [JsonPropertyName("delay")]
    public TimeSpan Delay { get; init; }

    /// <summary>
    /// Optional description of what the app is waiting for, recorded in the engine log.
    /// </summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; init; }
}
