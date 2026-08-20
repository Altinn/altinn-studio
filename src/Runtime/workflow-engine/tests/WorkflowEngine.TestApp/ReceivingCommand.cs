using System.Collections.Concurrent;
using WorkflowEngine.Models;

namespace WorkflowEngine.TestApp;

/// <summary>
/// Records the mailbox rendezvous it was handed on every attempt, and can be made to fail first — the
/// stand-in for an app's reply handler.
/// </summary>
public sealed class ReceivingCommand : Command<ReceivingCommandData>
{
    private static readonly ConcurrentDictionary<string, ConcurrentQueue<ReceivedMessage>> _received = new(
        StringComparer.Ordinal
    );

    public static IReadOnlyList<ReceivedMessage> Received(string key) =>
        _received.TryGetValue(key, out var queue) ? [.. queue] : [];

    public static void Reset() => _received.Clear();

    /// <inheritdoc/>
    public override string CommandType => "test-receive";

    /// <inheritdoc/>
    protected override CommandValidationResult Validate(ReceivingCommandData? commandData) =>
        commandData is null || string.IsNullOrWhiteSpace(commandData.Key)
            ? new CommandValidationResult.Invalid("test-receive requires a 'key' in command data")
            : new CommandValidationResult.Valid();

    /// <inheritdoc/>
    protected override Task<ExecutionResult> Execute(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        var data = context.GetCommandData<ReceivingCommandData>();
        var queue = _received.GetOrAdd(data.Key, _ => new ConcurrentQueue<ReceivedMessage>());
        queue.Enqueue(ReceivedMessage.From(context.MailboxReceipt));

        if (queue.Count >= data.SucceedOnAttempt)
            return Task.FromResult(ExecutionResult.Success());

        return Task.FromResult(
            data.FailCritically
                ? ExecutionResult.CriticalError("test-receive was told to fail this attempt terminally")
                : ExecutionResult.RetryableError("test-receive was told to fail this attempt")
        );
    }
}

public sealed record ReceivingCommandData
{
    /// <summary>Identity for the recording, unique per test.</summary>
    public required string Key { get; init; }

    /// <summary>Attempt number on which the command succeeds; earlier attempts fail.</summary>
    public int SucceedOnAttempt { get; init; } = 1;

    /// <summary>Whether failing attempts fail terminally (needing an operator resume) rather than retryably.</summary>
    public bool FailCritically { get; init; }
}

/// <summary>
/// One attempt's <see cref="CommandExecutionContext.MailboxReceipt"/> flattened to a comparable value.
/// </summary>
public sealed record ReceivedMessage(
    Guid? MailboxId,
    long? Seq,
    string? DeliveryKey,
    string? Payload,
    MailboxDisposedReason? DisposedReason
)
{
    internal static ReceivedMessage From(MailboxReceipt? receipt) =>
        new(
            receipt?.MailboxId,
            receipt?.Seq,
            receipt?.Delivery?.IdempotencyKey,
            receipt?.Delivery?.Payload,
            receipt?.DisposedReason
        );
}
