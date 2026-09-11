using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

internal interface IWorkflowExecutor
{
    Task<ExecutionResult> Execute(Workflow workflow, Step step, CancellationToken cancellationToken);
}

internal class WorkflowExecutor : IWorkflowExecutor
{
    /// <summary>
    /// The largest delay <see cref="CancellationTokenSource.CancelAfter(TimeSpan)"/> accepts. Timeouts
    /// outside (0, this] would throw <see cref="ArgumentOutOfRangeException"/> from the executor, which
    /// upstream treats as an engine fault (workflow reclaim → poisoned), so they are rejected as a
    /// critical step error instead. Enqueue validation bounds new requests; this guards persisted steps.
    /// </summary>
    private static readonly TimeSpan _maxSupportedExecutionTimeout = TimeSpan.FromMilliseconds(uint.MaxValue - 2);

    private readonly EngineSettings _engineSettings;
    private readonly ICommandRegistry _registry;
    private readonly IEngineRepository _repository;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<WorkflowExecutor> _logger;

    public WorkflowExecutor(
        IOptions<EngineSettings> engineSettings,
        ICommandRegistry registry,
        IEngineRepository repository,
        TimeProvider timeProvider,
        ILogger<WorkflowExecutor> logger
    )
    {
        _engineSettings = engineSettings.Value;
        _registry = registry;
        _repository = repository;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<ExecutionResult> Execute(Workflow workflow, Step step, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        using var activity = Metrics.Source.StartActivity(
            "WorkflowExecutor.Execute",
            parentContext: step.EngineActivity?.Context
        );
        _logger.ExecutingStep(step, workflow);

        var timeout = step.Command.MaxExecutionTime ?? _engineSettings.DefaultStepCommandTimeout;
        if (timeout <= TimeSpan.Zero || timeout > _maxSupportedExecutionTimeout)
        {
            return ExecutionResult.CriticalError(
                $"Step has an invalid execution timeout ({timeout}); it must be positive and at most {_maxSupportedExecutionTimeout}."
            );
        }

        // Shared with the cancellation source below: the deadline a command paces itself against must
        // be the instant that will actually cut it off.
        var executionDeadline = _timeProvider.GetUtcNow().Add(timeout);

        using CancellationTokenSource cts = CreateExecutionTokenSource(timeout, cancellationToken);
        var startTimestamp = Stopwatch.GetTimestamp();

        try
        {
            var descriptor = _registry.GetCommand(step.Command.Type);

            // Centralized deserialization — commands receive typed data
            object? typedCommandData = null;
            if (descriptor.CommandDataType is not null)
            {
                if (step.Command.Data is not { } rawData)
                {
                    return ExecutionResult.CriticalError(
                        $"Command '{step.Command.Type}' requires command data of type "
                            + $"{descriptor.CommandDataType.Name}, but none was provided"
                    );
                }
                typedCommandData = rawData.Deserialize(descriptor.CommandDataType, CommandDefinition.SerializerOptions);
            }

            object? typedWorkflowContext = null;
            if (descriptor.WorkflowContextType is not null)
            {
                if (workflow.Context is not { } rawContext)
                {
                    return ExecutionResult.CriticalError(
                        $"Command '{step.Command.Type}' requires workflow context of type "
                            + $"{descriptor.WorkflowContextType.Name}, but none was provided"
                    );
                }
                typedWorkflowContext = rawContext.Deserialize(
                    descriptor.WorkflowContextType,
                    CommandDefinition.SerializerOptions
                );
            }

            var stateIn = ResolveStateIn(workflow, step);

            var rendezvous = await ResolveMailboxReceipt(workflow, step, cts.Token);
            if (rendezvous.Failure is { } unresolved)
                return unresolved;

            var context = new CommandExecutionContext
            {
                Workflow = workflow,
                Step = step,
                RawCommandData = step.Command.Data,
                TypedCommandData = typedCommandData,
                TypedWorkflowContext = typedWorkflowContext,
                StateIn = stateIn,
                ExecutionDeadline = executionDeadline,
                WaitDeadline = step.ResolveWaitDeadline(_engineSettings),
                MailboxReceipt = rendezvous.Receipt,
                ParentTraceContext = activity?.Context ?? step.EngineActivity?.Context,
            };

            var result = await descriptor.Execute(context, cts.Token);

            if (result.IsSuccess())
                _logger.SuccessfulExecution(step, Stopwatch.GetElapsedTime(startTimestamp));
            else if (result.IsDeferred())
                _logger.DeferredExecution(
                    step,
                    Stopwatch.GetElapsedTime(startTimestamp),
                    result.Message ?? "outcome not available yet"
                );
            else
                _logger.FailedExecution(
                    step,
                    Stopwatch.GetElapsedTime(startTimestamp),
                    result.Message ?? "no details specified"
                );

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw; // handle this gracefully upstream
        }
        catch (CommandHandlerNotFoundException e)
        {
            activity?.Errored(e);
            _logger.UnhandledExecutionError(step, Stopwatch.GetElapsedTime(startTimestamp), e.Message, e);
            return ExecutionResult.CriticalError(e.Message, e);
        }
        catch (JsonException e)
        {
            activity?.Errored(e);
            _logger.UnhandledExecutionError(step, Stopwatch.GetElapsedTime(startTimestamp), e.Message, e);
            return ExecutionResult.CriticalError(
                $"Failed to deserialize command data or workflow context: {e.Message}",
                e
            );
        }
        catch (CommandDataTypeMismatchException e)
        {
            activity?.Errored(e);
            _logger.UnhandledExecutionError(step, Stopwatch.GetElapsedTime(startTimestamp), e.Message, e);
            return ExecutionResult.CriticalError(e.Message, e);
        }
        catch (Exception e)
        {
            activity?.Errored(e);
            _logger.UnhandledExecutionError(step, Stopwatch.GetElapsedTime(startTimestamp), e.Message, e);
            return ExecutionResult.RetryableError(e);
        }
    }

    /// <summary>
    /// Reads the mailbox rendezvous for a receive workflow's first step; every other step answers "nothing to
    /// read" from two field comparisons and no SQL.
    /// </summary>
    /// <remarks>
    /// Read per attempt, over rows that cannot change once the receiver is runnable, so a retry reconstructs
    /// the same callback. The two states the rendezvous cannot produce fail the step critically rather than
    /// degrading into "no delivery", which is a statement, not an absence.
    /// </remarks>
    private async Task<MailboxRendezvous> ResolveMailboxReceipt(
        Workflow workflow,
        Step step,
        CancellationToken cancellationToken
    )
    {
        if (workflow.MailboxId is null || step.ProcessingOrder != 0)
            return default;

        var result = await _repository.ReadMailboxReceipt(workflow.DatabaseId, cancellationToken);

        switch (result)
        {
            case MailboxReceiptResult.Resolved(var receipt):
                return new MailboxRendezvous(receipt, null);

            case MailboxReceiptResult.Unregistered:
                _logger.MailboxReceiverUnregistered(step, workflow, workflow.MailboxId.Value);
                Metrics.MailboxRendezvousViolations.Add(1, ("state", "unregistered"));
                return new MailboxRendezvous(
                    null,
                    ExecutionResult.CriticalError(
                        $"Receive workflow {workflow.DatabaseId} holds no position in mailbox "
                            + $"{workflow.MailboxId.Value}; the mailbox and its log are gone, so the message this "
                            + "step was to receive can no longer be read."
                    )
                );

            case MailboxReceiptResult.Undecided(var mailboxId, var seq):
                _logger.MailboxReceiverUndecided(step, workflow, mailboxId, seq);
                Metrics.MailboxRendezvousViolations.Add(1, ("state", "undecided"));
                return new MailboxRendezvous(
                    null,
                    ExecutionResult.CriticalError(
                        $"Receive workflow {workflow.DatabaseId} became runnable at position {seq} of open mailbox "
                            + $"{mailboxId} with no message there; a receiver may only run once its message exists "
                            + "or its mailbox has closed."
                    )
                );

            default:
                throw new UnreachableException($"Unhandled mailbox receipt result: {result.GetType().Name}");
        }
    }

    /// <summary>
    /// Resolves the state handed to a step: its own output if it has produced one, otherwise the most
    /// recent output of an earlier step (or the workflow's initial state for the first step).
    /// </summary>
    /// <remarks>
    /// Preferring its own output is what makes deferral stateful across polls: a command that yields
    /// resumes from the state it produced, not from whatever the previous step left behind. Narrower
    /// than it looks — only a success-shaped outcome writes <c>StateOut</c>, so deferral is the only
    /// path that produces state and then re-executes.
    /// </remarks>
    private static string? ResolveStateIn(Workflow workflow, Step step)
    {
        if (step.StateOut is not null)
            return step.StateOut;

        if (step.ProcessingOrder == 0)
            return workflow.InitialState;

        return workflow
            .Steps.Where(s => s.ProcessingOrder < step.ProcessingOrder)
            .OrderByDescending(s => s.ProcessingOrder)
            .Select(s => s.StateOut)
            .FirstOrDefault(s => s is not null);
    }

    private static CancellationTokenSource CreateExecutionTokenSource(
        TimeSpan timeout,
        CancellationToken cancellationToken
    )
    {
        var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(timeout);

        return cts;
    }
}

/// <summary>
/// The outcome of resolving a step's mailbox rendezvous: the receipt to hand the command, or the failure that
/// stops the attempt before the command is called. <c>default</c> is "this step receives from no mailbox".
/// </summary>
internal readonly record struct MailboxRendezvous(MailboxReceipt? Receipt, ExecutionResult? Failure);

internal static partial class WorkflowExecutorLogs
{
    [LoggerMessage(LogLevel.Information, "Executing step {Step} for workflow {Workflow}")]
    internal static partial void ExecutingStep(this ILogger<WorkflowExecutor> logger, Step step, Workflow workflow);

    [LoggerMessage(LogLevel.Information, "Step {Step} executed with success in {Elapsed}")]
    internal static partial void SuccessfulExecution(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        TimeSpan elapsed
    );

    [LoggerMessage(LogLevel.Information, "Step {Step} deferred after {Elapsed}: {Message}")]
    internal static partial void DeferredExecution(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        TimeSpan elapsed,
        string message
    );

    [LoggerMessage(LogLevel.Error, "Step {Step} executed with error in {Elapsed}: {Message}")]
    internal static partial void FailedExecution(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        TimeSpan elapsed,
        string message
    );

    [LoggerMessage(
        LogLevel.Error,
        "Step {Step} of receive workflow {Workflow} holds no position in mailbox {MailboxId}; its registration and the mailbox's log have been purged"
    )]
    internal static partial void MailboxReceiverUnregistered(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        Workflow workflow,
        Guid mailboxId
    );

    // An engine invariant violation, not a caller mistake: the rendezvous releases a receiver only once its
    // message exists or its mailbox has closed, and a closed mailbox never reopens.
    [LoggerMessage(
        LogLevel.Error,
        "Step {Step} of receive workflow {Workflow} is running at position {Seq} of mailbox {MailboxId}, which is still open and holds no message there"
    )]
    internal static partial void MailboxReceiverUndecided(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        Workflow workflow,
        Guid mailboxId,
        long seq
    );

    [LoggerMessage(LogLevel.Error, "Execution of step {Step} failed after {Elapsed}: {Message}")]
    internal static partial void UnhandledExecutionError(
        this ILogger<WorkflowExecutor> logger,
        Step step,
        TimeSpan elapsed,
        string message,
        Exception ex
    );
}
