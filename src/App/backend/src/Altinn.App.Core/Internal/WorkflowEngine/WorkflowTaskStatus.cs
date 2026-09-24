using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Presentation projection of the current task's live workflow status, used to enrich the process
/// state sent to the frontend. <see cref="Failure"/> is only set when <see cref="Status"/> is
/// <see cref="WorkflowActivityStatus.Failed"/>. <see cref="Retrying"/> and <see cref="Progress"/>
/// are only meaningful while <see cref="Status"/> is
/// <see cref="WorkflowActivityStatus.Processing"/>: retrying means the engine has the transition
/// parked between automatic retry attempts (a previous attempt failed), letting a waiting UI say
/// "a step is being retried" instead of an unexplained long wait; progress is how far through the
/// transition's engine steps execution has come. <see cref="FailedAttempts"/> (also processing-only)
/// counts the current step's consecutive failed attempts and, unlike retrying, holds steady while a
/// retry attempt executes. <see cref="StartedAt"/> (also processing-only) is
/// when the transition was enqueued, or last resumed. Together with <see cref="CurrentTime"/>, sampled on the same
/// engine clock, it lets a reconnecting client measure elapsed processing time without comparing
/// client and server clocks.
/// </summary>
internal sealed record WorkflowTaskStatus(
    WorkflowActivityStatus Status,
    string? TargetTask,
    WorkflowFailure? Failure,
    bool Retrying = false,
    WorkflowStepProgress? Progress = null,
    DateTimeOffset? StartedAt = null,
    string? WaitingReason = null,
    DateTimeOffset? CurrentTime = null,
    int FailedAttempts = 0
)
{
    /// <summary>
    /// Projects this status onto the client-facing wire shape. Only the coarse failure
    /// classification and the safe structured support-reference facts are projected - never the
    /// raw error detail (it can contain internal text).
    /// </summary>
    internal AppProcessWorkflowStatus ToAppProcessWorkflowStatus() =>
        new()
        {
            Status = Status,
            TargetTask = TargetTask,
            Retrying = Retrying ? true : null,
            FailedAttempts = FailedAttempts > 0 ? FailedAttempts : null,
            WaitingReason = WaitingReason,
            Progress = Progress is { } progress
                ? new AppProcessWorkflowProgress { Completed = progress.Completed, Total = progress.Total }
                : null,
            StartedAt = StartedAt,
            CurrentTime = CurrentTime,
            Failure = Failure is { } failure
                ? new AppProcessWorkflowFailure
                {
                    Kind = failure.Kind,
                    WorkflowId = failure.WorkflowId,
                    OccurredAt = failure.LastError?.Timestamp,
                }
                : null,
        };
}

/// <summary>
/// Progress through a transition's engine steps: <see cref="Completed"/> of <see cref="Total"/>
/// steps have finished. Presentation-only - the step identities stay internal.
/// </summary>
internal sealed record WorkflowStepProgress(int Completed, int Total);
