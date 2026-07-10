using System.Collections.Concurrent;
using System.Text.Json.Serialization;
using WorkflowEngine.Models;

namespace WorkflowEngine.TestApp;

/// <summary>
/// Command data for <see cref="StateProbeCommand"/>: a probe id to record the observed inbound
/// state under, and an optional state to emit as the step's <see cref="Step.StateOut"/>.
/// </summary>
public sealed record StateProbeCommandData
{
    [JsonPropertyName("probeId")]
    public required string ProbeId { get; init; }

    [JsonPropertyName("stateOut")]
    public string? StateOut { get; init; }
}

/// <summary>
/// Test-only command that records the <see cref="CommandExecutionContext.StateIn"/> it executed
/// with, keyed by probe id, and optionally produces a new state. Integration tests run in-process
/// with the host, so they read the recordings straight off the static store. Used to observe state
/// threading behavior (initial state, step chaining, and dependency state inheritance).
/// </summary>
public sealed class StateProbeCommand : Command<StateProbeCommandData>
{
    /// <summary>The command type discriminator used in <see cref="CommandDefinition.Type"/>.</summary>
    public const string CommandTypeId = "state-probe";

    private static readonly ConcurrentDictionary<string, string?> _observedStates = new();

    /// <inheritdoc/>
    public override string CommandType => CommandTypeId;

    /// <summary>
    /// Returns the state the probe step executed with, or <see langword="false"/> when the probe
    /// has not run yet.
    /// </summary>
    public static bool TryGetObservedStateIn(string probeId, out string? stateIn) =>
        _observedStates.TryGetValue(probeId, out stateIn);

    /// <summary>
    /// Creates a <see cref="CommandDefinition"/> for a state probe step.
    /// </summary>
    public static CommandDefinition Create(string probeId, string? stateOut = null) =>
        CommandDefinition.Create(CommandTypeId, new StateProbeCommandData { ProbeId = probeId, StateOut = stateOut });

    /// <inheritdoc/>
    protected override CommandValidationResult Validate(StateProbeCommandData? commandData) =>
        commandData is null || string.IsNullOrWhiteSpace(commandData.ProbeId)
            ? new CommandValidationResult.Invalid("state-probe requires a 'probeId' in command data")
            : new CommandValidationResult.Valid();

    /// <inheritdoc/>
    protected override Task<ExecutionResult> Execute(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        var commandData = context.GetCommandData<StateProbeCommandData>();
        _observedStates[commandData.ProbeId] = context.StateIn;

        if (commandData.StateOut is not null)
        {
            context.Step.StateOut = commandData.StateOut;
        }

        return Task.FromResult(ExecutionResult.Success());
    }
}
