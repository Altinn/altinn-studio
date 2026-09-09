using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

/// <summary>
/// Response body from a successful Altinn app callback.
/// </summary>
internal sealed record AppCallbackResponse
{
    /// <summary>
    /// Updated opaque state blob to pass to the next command.
    /// </summary>
    [JsonPropertyName("state")]
    public string? State { get; init; }

    /// <summary>
    /// Set when the command ran without error but the outcome it awaits is not available yet. Its
    /// presence is what tells the engine to park the step and re-execute it later, rather than treating
    /// the callback as a completed step.
    /// </summary>
    [JsonPropertyName("defer")]
    public AppCallbackDeferral? Defer { get; init; }
}

/// <summary>
/// A request to be executed again later, because what the command is waiting for has not happened yet.
/// </summary>
internal sealed record AppCallbackDeferral
{
    /// <summary>
    /// How long the engine should wait before executing the command again. This re-check only — the
    /// step's wait budget caps the total across all of them.
    /// </summary>
    [JsonPropertyName("delay")]
    public TimeSpan Delay { get; init; }

    /// <summary>
    /// Optional description of what is being waited for, recorded in the engine log.
    /// </summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; init; }
}
