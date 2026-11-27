namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

internal abstract class WorkflowEngineCommandResult { }

internal sealed record ProcessNextContinuation(string? Action);

internal sealed class SuccessfulWorkflowEngineCommandResult : WorkflowEngineCommandResult
{
    /// <summary>
    /// Enqueues a dependent process-next workflow after saving and re-capturing callback state.
    /// Used by an acquire continuing its transition and by a service task advancing to the next task.
    /// </summary>
    public ProcessNextContinuation? ProcessNextContinuation { get; init; }

    /// <summary>
    /// What the service task relay must do once this callback's data changes are saved and re-captured: enqueue a
    /// receiver or the next item's workflow, or close the mailbox and start what comes after it. <c>null</c> on
    /// every callback that is not a service task step's. It rides the result rather than being acted on inside the
    /// command because the successor must start on the state this step <em>published</em>.
    /// </summary>
    public ServiceTaskContinuation? ServiceTaskContinuation { get; init; }
}

/// <summary>
/// The command ran without error, but the outcome it awaits is not available yet. The engine runs
/// the command again after the delay. The controller returns the incoming state without saving changes.
/// </summary>
internal sealed class DeferredWorkflowEngineCommandResult : WorkflowEngineCommandResult
{
    /// <summary>
    /// How long the engine should wait before executing the command again.
    /// </summary>
    public required TimeSpan Delay { get; init; }

    /// <summary>
    /// Optional description of what is being waited for, forwarded to the engine log.
    /// </summary>
    public string? Reason { get; init; }
}

internal sealed class FailedWorkflowEngineCommandResult : WorkflowEngineCommandResult
{
    public readonly string ErrorMessage;
    public readonly string ExceptionType;
    public readonly bool NonRetryable;
    public readonly Exception? Exception;

    /// <summary>
    /// The failure was Altinn Authorization denying the app while it acted as the service owner,
    /// which almost always means the app's policy is missing a service-owner grant rather than that
    /// anything transient happened. Recorded here because only the caught exception can tell, and
    /// explained where the app and task are known (see <see cref="ServiceOwnerAuthorizationDiagnostics"/>).
    /// It deliberately does not affect the retry classification, because a transient failure in Altinn
    /// Authorization can reach the app as the same 403.
    /// </summary>
    public readonly bool ServiceOwnerAuthorizationDenied;

    /// <summary>
    /// Creates a retryable failure from a caught exception (likely transient — Storage down, HTTP timeout, etc.).
    /// </summary>
    public static FailedWorkflowEngineCommandResult Retryable(Exception exception) =>
        new(
            exception.Message,
            exception.GetType().Name,
            nonRetryable: false,
            exception,
            serviceOwnerAuthorizationDenied: ServiceOwnerAuthorizationDiagnostics.IsForbidden(exception)
        );

    /// <summary>
    /// Creates a retryable failure from a caught exception (likely transient — Storage down, HTTP timeout, etc.).
    /// </summary>
    public static FailedWorkflowEngineCommandResult Retryable(string errorMessage, string? exceptionType = null) =>
        new(errorMessage, exceptionType, nonRetryable: false, exception: null);

    /// <summary>
    /// Creates a non-retryable failure (validation error, business rule violation, etc.).
    /// The workflow engine will stop retrying and mark the step as permanently failed.
    /// </summary>
    public static FailedWorkflowEngineCommandResult Permanent(string errorMessage, string? exceptionType = null) =>
        new(errorMessage, exceptionType, nonRetryable: true);

    private FailedWorkflowEngineCommandResult(
        string errorMessage,
        string? exceptionType,
        bool nonRetryable,
        Exception? exception = null,
        bool serviceOwnerAuthorizationDenied = false
    )
    {
        ErrorMessage = errorMessage;
        ExceptionType = exceptionType ?? "Not specified";
        NonRetryable = nonRetryable;
        Exception = exception;
        ServiceOwnerAuthorizationDenied = serviceOwnerAuthorizationDenied;
    }
}
