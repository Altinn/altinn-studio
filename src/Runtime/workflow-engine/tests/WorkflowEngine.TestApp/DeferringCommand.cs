using System.Collections.Concurrent;
using WorkflowEngine.Models;

namespace WorkflowEngine.TestApp;

/// <summary>
/// Test command that defers until it has been invoked <see cref="DeferringCommandData.SucceedOnAttempt"/>
/// times, then succeeds — a stand-in for a real long-poll integration (eFormidling delivery
/// confirmation and friends). Invocations are tracked per <see cref="DeferringCommandData.Key"/> so a
/// test can assert exactly how many times the engine re-executed the step.
/// </summary>
public sealed class DeferringCommand : Command<DeferringCommandData>
{
    private static readonly ConcurrentDictionary<string, int> _invocations = new(StringComparer.Ordinal);

    /// <summary>
    /// How many times the command has run for the given command-data key.
    /// </summary>
    public static int InvocationCount(string key) => _invocations.GetValueOrDefault(key);

    /// <summary>
    /// Clears all invocation counts. Tests call this before each run.
    /// </summary>
    public static void ResetInvocations() => _invocations.Clear();

    /// <inheritdoc/>
    public override string CommandType => "test-defer";

    /// <inheritdoc/>
    protected override CommandValidationResult Validate(DeferringCommandData? commandData) =>
        commandData is null || string.IsNullOrWhiteSpace(commandData.Key)
            ? new CommandValidationResult.Invalid("test-defer requires a 'key' in command data")
            : new CommandValidationResult.Valid();

    /// <inheritdoc/>
    protected override Task<ExecutionResult> Execute(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        var data = context.GetCommandData<DeferringCommandData>();
        var attempt = _invocations.AddOrUpdate(data.Key, 1, (_, count) => count + 1);

        return Task.FromResult(
            attempt >= data.SucceedOnAttempt
                ? ExecutionResult.Success()
                : ExecutionResult.Defer(TimeSpan.FromMilliseconds(data.DeferDelayMs), "not ready yet")
        );
    }
}

/// <summary>
/// Command data for <see cref="DeferringCommand"/>.
/// </summary>
public sealed record DeferringCommandData
{
    /// <summary>Identity for the invocation counter — unique per test.</summary>
    public required string Key { get; init; }

    /// <summary>Attempt number on which the command succeeds. Use a large value to never succeed.</summary>
    public int SucceedOnAttempt { get; init; } = 1;

    /// <summary>Delay requested by each deferral.</summary>
    public int DeferDelayMs { get; init; } = 200;
}
