using Altinn.App.Core.Internal.WorkflowEngine.Commands;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The outcome of one workflow command. Use these factories; service-task coordination results are internal.
/// </summary>
public abstract class ProcessEngineCommandResult
{
    private protected ProcessEngineCommandResult() { }

    /// <summary>The command completed. Its data changes are saved and the workflow continues.</summary>
    public static ProcessEngineCommandResult Completed() => new SuccessfulProcessEngineCommandResult();

    /// <summary>
    /// The command could not finish because of a failure that may heal. Its pending data changes are not
    /// saved, and the engine retries with backoff. External effects must still be safe to repeat.
    /// </summary>
    public static ProcessEngineCommandResult FailedRetryable(string errorMessage, string? errorCode = null) =>
        FailedProcessEngineCommandResult.Retryable(errorMessage, errorCode);

    /// <summary>
    /// The command cannot finish until its cause is corrected. Its pending data changes are not saved.
    /// The workflow fails without automatic retries; an operator can resume it after correcting the cause.
    /// </summary>
    public static ProcessEngineCommandResult FailedPermanent(string errorMessage, string? errorCode = null) =>
        FailedProcessEngineCommandResult.Permanent(errorMessage, errorCode);
}
