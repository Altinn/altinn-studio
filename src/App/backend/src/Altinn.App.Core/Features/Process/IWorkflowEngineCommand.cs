namespace Altinn.App.Core.Features.Process;

/// <summary>
/// One named, durable workflow operation. Register implementations as <see cref="IWorkflowEngineCommand"/>
/// in the service collection and declare their keys from a process task's lifecycle methods.
/// </summary>
/// <remarks>
/// Commands must be idempotent. The engine can repeat an attempt after a failure or a lost response,
/// including after data or external effects were saved. Use persisted progress and stable workflow/step
/// IDs to reconcile earlier attempts. Dependencies are resolved in the callback scope.
/// </remarks>
[ImplementableByApps]
public interface IWorkflowEngineCommand
{
    /// <summary>
    /// The stable, case-sensitive key used by persisted workflows. Keys must be unique among all commands.
    /// Start with an ASCII letter and use only ASCII letters, digits, dots, underscores or hyphens.
    /// </summary>
    string GetKey();

    /// <summary>
    /// Executes one step. Successful data changes are saved before the next step runs. A thrown exception
    /// is retryable; cancellation requested through the context is propagated.
    /// </summary>
    Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context);

    /// <summary>
    /// Default timeout and retry options. Unset fields use the engine defaults. Service-task and hook
    /// implementation options can override the coordinating command's defaults.
    /// </summary>
    ProcessStepOptions? DefaultStepOptions => null;
}
