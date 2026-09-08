using WorkflowEngine.Models;

namespace WorkflowEngine.TestApp;

/// <summary>
/// Test command that skips the rest of its workflow with the reason given in its command data — a
/// stand-in for a command that runs fine and finds that neither its own work nor any later step must
/// happen (the app's process-status acquisition losing to a concurrent change of the instance).
/// </summary>
public sealed class SkippingCommand : Command<SkippingCommandData>
{
    /// <inheritdoc/>
    public override string CommandType => "test-skip";

    /// <inheritdoc/>
    protected override CommandValidationResult Validate(SkippingCommandData? commandData) =>
        commandData is null || string.IsNullOrWhiteSpace(commandData.Reason)
            ? new CommandValidationResult.Invalid("test-skip requires a 'reason' in command data")
            : new CommandValidationResult.Valid();

    /// <inheritdoc/>
    protected override Task<ExecutionResult> Execute(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        var data = context.GetCommandData<SkippingCommandData>();
        return Task.FromResult(ExecutionResult.Skip(data.Reason));
    }
}

/// <summary>
/// Command data for <see cref="SkippingCommand"/>.
/// </summary>
public sealed record SkippingCommandData
{
    /// <summary>The reason recorded on the skipping step — the code a consumer would classify on.</summary>
    public required string Reason { get; init; }
}
