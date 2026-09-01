namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

internal abstract class ProcessEngineCommandResult { }

internal sealed class SuccessfulProcessEngineCommandResult : ProcessEngineCommandResult
{
    /// <summary>
    /// When true, the controller should enqueue a process-next workflow after saving data.
    /// Used by service tasks that want the process to automatically advance.
    /// </summary>
    public bool AutoAdvanceProcess { get; init; }

    /// <summary>
    /// Optional action to use when auto-advancing (e.g. "reject").
    /// Only relevant when <see cref="AutoAdvanceProcess"/> is true.
    /// </summary>
    public string? AutoAdvanceAction { get; init; }

    /// <summary>
    /// What the mailbox relay must do once this callback's data changes are saved and re-captured: enqueue the
    /// exchange's next receiver, or close the mailbox and start what comes after it. <c>null</c> on every callback
    /// that is not a mailbox reply handler's. It rides the result rather than being acted on inside the command
    /// because the successor must start on the state this handler <em>published</em>.
    /// </summary>
    public MailboxContinuation? MailboxContinuation { get; init; }
}

/// <summary>
/// The command ran without error, but the outcome it awaits is not available yet. The controller saves
/// data and re-signs state as it would for a success, but must not auto-advance the process.
/// </summary>
internal sealed class DeferredProcessEngineCommandResult : ProcessEngineCommandResult
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

internal sealed class FailedProcessEngineCommandResult : ProcessEngineCommandResult
{
    public readonly string ErrorMessage;
    public readonly string ExceptionType;
    public readonly bool NonRetryable;

    /// <summary>
    /// The failure was Altinn Authorization denying the app while it acted as the service owner,
    /// which almost always means the app's policy is missing a service-owner grant rather than that
    /// anything transient happened. Recorded here because only the caught exception can tell, and
    /// explained where the app and task are known (see <see cref="ServiceOwnerAuthorizationDiagnostics"/>).
    /// It deliberately does not affect the retry classification.
    /// </summary>
    public readonly bool ServiceOwnerAuthorizationDenied;

    /// <summary>
    /// What the mailbox relay must still do despite the failure. Set only by a permanent failure that
    /// concludes — a reply handler's, or an opening stage's <c>Conclude(FailedPermanent)</c>: an exchange
    /// the app has given up on must stop accepting messages, even though nothing downstream starts.
    /// </summary>
    public readonly MailboxContinuation? MailboxContinuation;

    /// <summary>
    /// Creates a retryable failure from a caught exception (likely transient — Storage down, HTTP timeout, etc.).
    /// </summary>
    public static FailedProcessEngineCommandResult Retryable(Exception exception) =>
        new(
            exception.Message,
            exception.GetType().Name,
            nonRetryable: false,
            serviceOwnerAuthorizationDenied: ServiceOwnerAuthorizationDiagnostics.IsAuthorizationDenied(exception)
        );

    /// <summary>
    /// Creates a retryable failure from a caught exception (likely transient — Storage down, HTTP timeout, etc.).
    /// </summary>
    public static FailedProcessEngineCommandResult Retryable(string errorMessage, string? exceptionType = null) =>
        new(errorMessage, exceptionType, nonRetryable: false);

    /// <summary>
    /// Creates a non-retryable failure (validation error, business rule violation, etc.).
    /// The workflow engine will stop retrying and mark the step as permanently failed.
    /// </summary>
    public static FailedProcessEngineCommandResult Permanent(
        string errorMessage,
        string? exceptionType = null,
        MailboxContinuation? mailboxContinuation = null
    ) => new(errorMessage, exceptionType, nonRetryable: true, mailboxContinuation);

    private FailedProcessEngineCommandResult(
        string errorMessage,
        string? exceptionType,
        bool nonRetryable,
        MailboxContinuation? mailboxContinuation = null,
        bool serviceOwnerAuthorizationDenied = false
    )
    {
        ErrorMessage = errorMessage;
        ExceptionType = exceptionType ?? "Not specified";
        NonRetryable = nonRetryable;
        ServiceOwnerAuthorizationDenied = serviceOwnerAuthorizationDenied;
        MailboxContinuation = mailboxContinuation;
    }
}
