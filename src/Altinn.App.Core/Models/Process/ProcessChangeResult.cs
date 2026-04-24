using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Process;

/// <summary>
/// Class representing the result of a process change
/// </summary>
public class ProcessChangeResult
{
    /// <summary>
    /// Gets or sets a value indicating whether the process change was successful
    /// </summary>
    [MemberNotNullWhen(true, nameof(ProcessStateChange))]
    [MemberNotNullWhen(false, nameof(ErrorMessage), nameof(ErrorType))]
    public bool Success { get; init; }

    /// <summary>
    /// Gets or sets the error title if the process change was not successful
    /// </summary>
    public string? ErrorTitle { get; set; }

    /// <summary>
    /// Gets or sets the error message if the process change was not successful
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Validation issues that occurred during the process change
    /// </summary>
    public List<ValidationIssueWithSource>? ValidationIssues { get; set; }

    /// <summary>
    /// Gets or sets the error type if the process change was not successful
    /// </summary>
    public ProcessErrorType? ErrorType { get; init; }

    /// <summary>
    /// Gets or sets the process state change if the process change was successful
    /// </summary>
    public ProcessStateChange? ProcessStateChange { get; init; }

    /// <summary>
    /// Structured workflow failure details when the async workflow execution failed.
    /// </summary>
    public WorkflowFailure? WorkflowFailure { get; init; }

    /// <summary>
    /// Frontend-oriented status for the current task when a normal process-next call is blocked.
    /// </summary>
    public ProcessNextState? ProcessNextState { get; init; }

    /// <summary>
    /// The persisted process state when a workflow failure happened after the process state was committed.
    /// </summary>
    public ProcessState? ProcessStateOnFailure { get; init; }

    /// <summary>
    /// Initializes a new <see cref="ProcessChangeResult"/> instance.
    /// </summary>
    public ProcessChangeResult() { }

    /// <summary>
    /// The mutated instance after the process change, if applicable
    /// </summary>
    internal Instance? MutatedInstance { get; init; }

    /// <summary>
    /// Initializes a new <see cref="ProcessChangeResult"/> instance with a mutated instance.
    /// </summary>
    internal ProcessChangeResult(Instance mutatedInstance)
    {
        MutatedInstance = mutatedInstance;
    }
}

/// <summary>
/// Types of errors that can occur during a process change
/// </summary>
public enum ProcessErrorType
{
    /// <summary>
    /// The process change was not allowed due to the current state of the process
    /// </summary>
    Conflict,

    /// <summary>
    /// The process change lead to an internal error
    /// </summary>
    Internal,

    /// <summary>
    /// The user is not authorized to perform the process change
    /// </summary>
    Unauthorized,

    /// <summary>
    /// The request was not valid
    /// </summary>
    BadRequest,
}

/// <summary>
/// Minimal state information for clients when a task cannot continue with a normal process-next.
/// </summary>
public enum ProcessNextState
{
    /// <summary>
    /// A workflow for the current task is still running or waiting for automatic retry.
    /// </summary>
    Retrying,

    /// <summary>
    /// The workflow for the current task failed and must be recovered before continuing.
    /// </summary>
    RecoveryRequired,
}

/// <summary>
/// Structured information about a workflow failure while moving process to the next task.
/// </summary>
public sealed class WorkflowFailure
{
    /// <summary>
    /// The failure classification.
    /// </summary>
    public WorkflowFailureKind Kind { get; init; }

    /// <summary>
    /// The workflow ID that failed, if known.
    /// </summary>
    public Guid? WorkflowId { get; init; }

    /// <summary>
    /// The workflow operation ID, if known.
    /// </summary>
    public string? WorkflowOperationId { get; init; }

    /// <summary>
    /// The step operation ID that failed, if known.
    /// </summary>
    public string? StepOperationId { get; init; }

    /// <summary>
    /// The failing command type, if known.
    /// </summary>
    public string? CommandType { get; init; }

    /// <summary>
    /// The retry count recorded on the failing step, if known.
    /// </summary>
    public int? RetryCount { get; init; }

    /// <summary>
    /// The latest error recorded for the failing step, if known.
    /// </summary>
    public WorkflowFailureError? LastError { get; init; }

    /// <summary>
    /// Suggested retry action, if any.
    /// </summary>
    public string? RetryAction { get; init; }

    /// <summary>
    /// The workflow ID to target for retry, if any.
    /// </summary>
    public Guid? RetryTargetWorkflowId { get; init; }
}

/// <summary>
/// Failure classifications for workflow-backed process-next operations.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum WorkflowFailureKind
{
    /// <summary>
    /// A workflow step failed.
    /// </summary>
    StepFailed,

    /// <summary>
    /// A workflow failed because one of its dependencies failed.
    /// </summary>
    DependencyFailed,

    /// <summary>
    /// The workflow engine or orchestration failed without a concrete failed step.
    /// </summary>
    EngineFault,

    /// <summary>
    /// Polling timed out before the workflow hierarchy reached a terminal state.
    /// </summary>
    Timeout,
}

/// <summary>
/// The latest error captured for a workflow failure.
/// </summary>
public sealed class WorkflowFailureError
{
    /// <summary>
    /// When the error happened.
    /// </summary>
    public DateTimeOffset Timestamp { get; init; }

    /// <summary>
    /// The error message.
    /// </summary>
    public string Message { get; init; } = string.Empty;

    /// <summary>
    /// The HTTP status code observed for the error, if any.
    /// </summary>
    public int? HttpStatusCode { get; init; }

    /// <summary>
    /// Whether the engine treated the error as retryable.
    /// </summary>
    public bool WasRetryable { get; init; }
}
