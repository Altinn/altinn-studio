using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// One durable step of a process task's lifecycle: a unit of work an <see cref="IProcessTask"/> declares for
/// its start, end or abandon phase, run by the workflow engine as a step of its own. A completed command never
/// runs again within the transition; a failed one is retried by the engine.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Implementations MUST be idempotent.</strong> The engine retries a failed attempt, and a step whose
/// response was lost after its data changes were saved is replayed with the state it started from. Read what
/// earlier attempts recorded in instance data before repeating a side effect, and use
/// <see cref="ProcessTaskCommandContext.WorkflowId"/> and <see cref="ProcessTaskCommandContext.StepId"/> as
/// idempotency keys for outbound calls.
/// </para>
/// <para>
/// A command cannot defer and cannot advance the process: it runs inside a transition, before or after the
/// process state commits depending on its phase. Work that must wait for something external belongs in a
/// service task.
/// </para>
/// <para>
/// Register implementations as <c>IProcessTaskCommand</c> in the service collection. Keys must be unique among
/// all task commands in the app; app startup fails when a task declares a key that no registered command
/// carries.
/// </para>
/// </remarks>
[ImplementableByApps]
public interface IProcessTaskCommand : IProcessStepConfigurable
{
    /// <summary>
    /// The key an <see cref="IProcessTask"/> declares this command by. Unique among the app's task commands, and
    /// visible in the engine's records as the step's operation id.
    /// </summary>
    string Key { get; }

    /// <summary>
    /// Runs the command. Data changes made through <see cref="ProcessTaskCommandContext.InstanceDataMutator"/> are
    /// saved when the command completes, and are visible to every later step of the transition.
    /// </summary>
    Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context);
}

/// <summary>
/// What an <see cref="IProcessTaskCommand"/> is handed when it runs.
/// </summary>
public sealed class ProcessTaskCommandContext
{
    /// <summary>
    /// Access to the instance and its data. Changes are saved when the command completes successfully.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    /// <summary>
    /// The BPMN element id of the task this command runs for: the task being entered for a start command, the
    /// task being left for an end or abandon command.
    /// </summary>
    public required string TaskId { get; init; }

    /// <summary>
    /// The payload the task declared alongside the command's key, or <c>null</c>. Fixed when the transition was
    /// enqueued; the command decides its format.
    /// </summary>
    public string? Payload { get; init; }

    /// <summary>
    /// The engine-assigned id of the workflow running this transition. Stable across retries and resume of the
    /// same transition; a new visit to the task runs under a new workflow id.
    /// </summary>
    public required Guid WorkflowId { get; init; }

    /// <summary>
    /// The engine's identity for the step running this command. Stable across every attempt of the step, which
    /// makes it a ready-made idempotency key for an outbound call the command must not repeat.
    /// </summary>
    public required Guid StepId { get; init; }

    /// <summary>
    /// Cancellation token for the operation.
    /// </summary>
    public CancellationToken CancellationToken { get; init; } = CancellationToken.None;
}

/// <summary>
/// The outcome of an <see cref="IProcessTaskCommand"/>. A closed set: use the factory methods.
/// </summary>
public abstract record ProcessTaskCommandResult
{
    private protected ProcessTaskCommandResult() { }

    /// <summary>
    /// The command did its work. Data changes are saved and the transition continues with the next step.
    /// </summary>
    public static ProcessTaskCommandResult Completed() => CompletedProcessTaskCommandResult.Instance;

    /// <summary>
    /// The command could not finish because of something that may heal: a dependency that did not answer, a
    /// throttled call. Nothing is saved; the engine retries the step with backoff. A thrown exception is treated
    /// the same way.
    /// </summary>
    public static ProcessTaskCommandResult FailedRetryable(string errorMessage) =>
        new FailedProcessTaskCommandResult(errorMessage, Permanent: false);

    /// <summary>
    /// The command cannot succeed however often it is retried: invalid configuration, a business rule that
    /// forbids the transition. Nothing is saved; the engine fails the step, and the transition is blocked until an
    /// operator resumes it after the cause is fixed.
    /// </summary>
    public static ProcessTaskCommandResult FailedPermanent(string errorMessage) =>
        new FailedProcessTaskCommandResult(errorMessage, Permanent: true);
}

internal sealed record CompletedProcessTaskCommandResult : ProcessTaskCommandResult
{
    public static readonly CompletedProcessTaskCommandResult Instance = new();
}

internal sealed record FailedProcessTaskCommandResult(string ErrorMessage, bool Permanent) : ProcessTaskCommandResult;
