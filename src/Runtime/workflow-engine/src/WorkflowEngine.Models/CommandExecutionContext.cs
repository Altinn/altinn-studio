using System.Diagnostics;
using System.Text.Json;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Models.Exceptions;

namespace WorkflowEngine.Models;

/// <summary>
/// Everything a command descriptor needs to execute a step.
/// </summary>
public sealed record CommandExecutionContext
{
    /// <summary>
    /// The parent workflow.
    /// </summary>
    public required Workflow Workflow { get; init; }

    /// <summary>
    /// The step being executed.
    /// </summary>
    public required Step Step { get; init; }

    /// <summary>
    /// The raw command configuration (from <see cref="CommandDefinition.Data"/>), for logging/diagnostics.
    /// </summary>
    public JsonElement? RawCommandData { get; init; }

    /// <summary>
    /// The deserialized command data, typed according to the descriptor's <see cref="ICommand.CommandDataType"/>.
    /// </summary>
    public object? TypedCommandData { get; init; }

    /// <summary>
    /// The deserialized workflow context, typed according to the descriptor's <see cref="ICommand.WorkflowContextType"/>.
    /// </summary>
    public object? TypedWorkflowContext { get; init; }

    /// <summary>
    /// State output from the previous step (or <see cref="Workflow.InitialState"/> for the first step).
    /// </summary>
    public string? StateIn { get; init; }

    /// <summary>
    /// The absolute instant the engine stops waiting for <em>this attempt</em> and treats it as a
    /// retryable failure — derived from <see cref="CommandDefinition.MaxExecutionTime"/> (or the engine
    /// default) at the moment execution started.
    /// </summary>
    /// <remarks>
    /// The cancellation token enforces this but only reports being cut off. The deadline lets a command
    /// decide beforehand — with 10 seconds left and a 30-second call to make, deferring for a fresh
    /// attempt beats starting work it cannot finish. Distinct from <see cref="WaitDeadline"/>, which
    /// bounds the whole wait rather than one attempt.
    /// </remarks>
    public DateTimeOffset? ExecutionDeadline { get; init; }

    /// <summary>
    /// The absolute instant this step's wait budget runs out, or <c>null</c> before its first deferral.
    /// Lets a deferring command pace itself against the budget it actually has — and give up early,
    /// deliberately, rather than being failed by the engine when the budget expires.
    /// </summary>
    /// <remarks>
    /// A deadline rather than a remaining duration, which would start aging the instant it is computed.
    /// Pair with <see cref="Step.DeferCount"/>.
    /// </remarks>
    public DateTimeOffset? WaitDeadline { get; init; }

    /// <summary>
    /// What the mailbox rendezvous produced for this step, or <c>null</c> on every step that does not receive from
    /// a mailbox. Read from the deliveries log at the start of the attempt rather than carried on the step, because
    /// the message may not have existed when the step was created — safe for exactly one reason: whether a delivery
    /// exists at the receiver's position is frozen before the receiver becomes runnable.
    /// </summary>
    public MailboxReceipt? MailboxReceipt { get; init; }

    /// <summary>
    /// Parent trace context for distributed tracing.
    /// </summary>
    public ActivityContext? ParentTraceContext { get; init; }

    /// <summary>
    /// Gets the pre-deserialized command data, cast to <typeparamref name="T"/>.
    /// </summary>
    public T GetCommandData<T>()
        where T : class =>
        TypedCommandData as T
        ?? throw new CommandDataTypeMismatchException(
            $"Command data is not of type {typeof(T).Name}. Actual: {TypedCommandData?.GetType().Name ?? "null"}"
        );

    /// <summary>
    /// Gets the pre-deserialized workflow context, cast to <typeparamref name="T"/>.
    /// </summary>
    public T GetWorkflowContext<T>()
        where T : class =>
        TypedWorkflowContext as T
        ?? throw new CommandDataTypeMismatchException(
            $"Workflow context is not of type {typeof(T).Name}. Actual: {TypedWorkflowContext?.GetType().Name ?? "null"}"
        );
}
