using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Represents a command that can be executed by the Process Engine.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: All implementations MUST be idempotent - commands may be retried on failure.</strong>
/// </remarks>
internal interface IWorkflowEngineCommand
{
    string GetKey();

    Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context);

    /// <summary>
    /// The command's default per-step execution options (timeout / retry strategy). This is the middle
    /// resolution tier: it overrides the engine's global defaults but is itself overridden by a
    /// per-implementation <see cref="IProcessStepConfigurable.StepOptions"/>. Null (the default) means
    /// the command has no opinion and the engine's global defaults apply.
    /// </summary>
    ProcessStepOptions? DefaultStepOptions => null;

    /// <summary>
    /// Whether the callback controller enqueues the side effects waiting in the workflow state once this command's
    /// work is saved. True for <c>CommitProcessState</c>, which saves the transition the steps before it enqueued
    /// side effects in, and for the commands that run app code after it. False (the default) for every command
    /// that runs before the commit: what a step there enqueues must wait for the transition to be saved.
    /// </summary>
    bool EnqueuesPendingSideEffects => false;

    /// <summary>
    /// Whether the command runs in a side-effects workflow, beside the process, on the state the transition saved.
    /// The callback controller never saves for such a command: the process may have saved since, so a save would
    /// either be refused as stale or, worse, race the process's own next save. True for the event registrations
    /// and <c>ExecuteSideEffect</c>.
    /// </summary>
    bool RunsAsSideEffect => false;
}

/// <summary>
/// Represents a command that can be executed by the Process Engine with a typed request payload.
/// </summary>
/// <typeparam name="TRequestPayload">The type of the request payload this command expects.</typeparam>
/// <remarks>
/// <strong>IMPORTANT: All implementations MUST be idempotent - commands may be retried on failure.</strong>
/// </remarks>
internal interface IWorkflowEngineCommand<in TRequestPayload> : IWorkflowEngineCommand
    where TRequestPayload : CommandRequestPayload
{
    Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context, TRequestPayload payload);
}
