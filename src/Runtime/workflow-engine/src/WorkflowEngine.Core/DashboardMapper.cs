using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core;

internal sealed record DashboardStepDto(
    string IdempotencyKey,
    string OperationId,
    string CommandType,
    string CommandDetail,
    string Status,
    int ProcessingOrder,
    int RetryCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExecutionStartedAt,
    DateTimeOffset? UpdatedAt,
    bool StateChanged
);

/// <summary>
/// A related workflow (dependency, dependent, or link) as shown on a dashboard card.
/// </summary>
internal sealed record DashboardRelationDto(Guid DatabaseId, string OperationId, string Status);

internal sealed record DashboardWorkflowDto(
    Guid DatabaseId,
    string IdempotencyKey,
    string OperationId,
    string Status,
    string? TraceId,
    string? CollectionKey,
    // Null on every ordinary workflow: the receive workflow's marker, and what matches a card to the
    // mailbox block it reads from without a second lookup.
    Guid? MailboxId,
    string Namespace,
    Dictionary<string, string>? Labels,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExecutionStartedAt,
    DateTimeOffset? UpdatedAt,
    DateTimeOffset? StartAt,
    DateTimeOffset? BackoffUntil,
    bool HasState,
    bool? IsHead,
    // Relation arrays are tri-state on the wire: omitted (null) = not loaded by the source query
    // (the frontend fetches on demand via /dashboard/relations), [] = loaded and none exist.
    IReadOnlyList<DashboardRelationDto>? DependsOn,
    IReadOnlyList<DashboardRelationDto>? Dependents,
    IReadOnlyList<DashboardRelationDto>? Links,
    IReadOnlyList<DashboardStepDto> Steps
);

/// <summary>
/// One position of a mailbox's log as a dashboard card shows it. <c>ParkedForSeconds</c> is null for a receiver
/// that never parked, which is what makes the number readable: zero would claim it waited and was released
/// instantly.
/// </summary>
internal sealed record DashboardMailboxPositionDto(
    long Position,
    string State,
    string? DeliveryKey,
    DateTimeOffset? AcceptedAt,
    Guid? ReceiverWorkflowId,
    DateTimeOffset? HeldAt,
    DateTimeOffset? ReleasedAt,
    DateTimeOffset? ClaimedAt,
    double? ParkedForSeconds
);

/// <summary>
/// The four states one position of a mailbox's log can be in, as the dashboard names them.
/// <see cref="Closed"/> is neither of the two it could have been folded into: a receiver released by the
/// mailbox closing is not <see cref="Waiting"/>, because its wait is over, and not <see cref="Consumed"/>,
/// because it was handed the closing signal rather than a message.
/// </summary>
internal static class DashboardMailboxPositionState
{
    /// <summary>A message stands here and no receiver has been enqueued for it — an unconsumed delivery.</summary>
    internal const string Delivered = "delivered";

    /// <summary>A receiver holds this position and its message is standing at it.</summary>
    internal const string Consumed = "consumed";

    /// <summary>A receiver is parked here and its message has not arrived.</summary>
    internal const string Waiting = "waiting";

    /// <summary>
    /// A receiver holds this position, no message ever arrived, and it is no longer waiting: the mailbox
    /// closed and released it with the closing signal.
    /// </summary>
    internal const string Closed = "closed";
}

/// <summary>
/// A mailbox as a dashboard card shows it: the mailbox row's own facts, plus its log position by
/// position with each receiver named so the card can link to it.
/// </summary>
internal sealed record DashboardMailboxDto(
    Guid Id,
    string Namespace,
    string IdempotencyKey,
    string? CollectionKey,
    string Status,
    string? DisposedReason,
    DateTimeOffset Deadline,
    DateTimeOffset CreatedAt,
    DateTimeOffset? DisposedAt,
    long NextIdx,
    long NextSeq,
    long UnconsumedDeliveries,
    IReadOnlyList<DashboardMailboxPositionDto> Positions
);

internal static class DashboardMapper
{
    internal static DashboardStepDto MapStep(Step step, bool stateChanged) =>
        new(
            step.DatabaseId.ToString(),
            step.OperationId,
            step.Command.Type,
            step.OperationId,
            step.Status.ToString(),
            step.ProcessingOrder,
            step.RequeueCount,
            step.CreatedAt,
            step.ExecutionStartedAt,
            step.UpdatedAt,
            stateChanged
        );

    internal static DashboardWorkflowDto MapWorkflow(Workflow workflow)
    {
        List<Step> ordered = workflow.Steps.OrderBy(s => s.ProcessingOrder).ToList();
        var mapped = new List<DashboardStepDto>(ordered.Count);
        string? prevState = workflow.InitialState;

        foreach (Step step in ordered)
        {
            bool changed = step.StateOut is not null && step.StateOut != prevState;
            mapped.Add(MapStep(step, changed));
            if (step.StateOut is not null)
                prevState = step.StateOut;
        }

        return new DashboardWorkflowDto(
            workflow.DatabaseId,
            workflow.IdempotencyKey,
            workflow.OperationId,
            workflow.Status.ToString(),
            Metrics.ParseTraceContext(workflow.EngineTraceContext)?.TraceId.ToString()
                ?? workflow.EngineActivity?.TraceId.ToString(),
            workflow.CollectionKey,
            workflow.MailboxId,
            workflow.Namespace,
            workflow.Labels,
            workflow.CreatedAt,
            workflow.ExecutionStartedAt,
            workflow.UpdatedAt,
            workflow.StartAt,
            workflow.BackoffUntil,
            workflow.InitialState is not null || ordered.Any(s => s.StateOut is not null),
            workflow.IsHead,
            MapRelations(workflow.Dependencies),
            MapRelations(workflow.Dependents),
            MapRelations(workflow.Links),
            mapped
        );
    }

    /// <summary>Projects one mailbox snapshot into its card shape.</summary>
    internal static DashboardMailboxDto MapMailbox(MailboxSnapshot snapshot)
    {
        MailboxResponse mailbox = snapshot.Mailbox;
        return new DashboardMailboxDto(
            mailbox.Id,
            mailbox.Namespace,
            mailbox.IdempotencyKey,
            mailbox.CollectionKey,
            mailbox.Status.ToString(),
            mailbox.DisposedReason?.ToString(),
            mailbox.Deadline,
            mailbox.CreatedAt,
            mailbox.DisposedAt,
            mailbox.NextIdx,
            mailbox.NextSeq,
            mailbox.UnconsumedDeliveries,
            [.. snapshot.Positions.Select(MapMailboxPosition)]
        );
    }

    /// <summary>Projects one position into its card shape, naming the state it is in.</summary>
    internal static DashboardMailboxPositionDto MapMailboxPosition(MailboxPosition position) =>
        new(
            position.Position,
            MapMailboxPositionState(position),
            position.DeliveryIdempotencyKey,
            position.AcceptedAt,
            position.ReceiverWorkflowId,
            position.HeldAt,
            position.ReleasedAt,
            position.ClaimedAt,
            position.HeldAt is { } heldAt && position.ReleasedAt is { } releasedAt
                ? (releasedAt - heldAt).TotalSeconds
                : null
        );

    /// <summary>
    /// Names one position's state, deciding from the receiver side first because that is the side that
    /// distinguishes the three states a receiver can be in. A position with no receiver is a message nobody has
    /// been enqueued for, and no other reason for such a position to exist: the read builds its positions from the
    /// rows of the two logs. The last branch is where <c>held_at</c> earns its keep — a receiver still parked and
    /// one the closing mailbox released look identical in the workflow's status once it has settled.
    /// </summary>
    private static string MapMailboxPositionState(MailboxPosition position)
    {
        if (position.ReceiverWorkflowId is null)
            return DashboardMailboxPositionState.Delivered;

        if (position.AcceptedAt is not null)
            return DashboardMailboxPositionState.Consumed;

        return position is { HeldAt: not null, ReleasedAt: null }
            ? DashboardMailboxPositionState.Waiting
            : DashboardMailboxPositionState.Closed;
    }

    internal static IReadOnlyList<DashboardRelationDto>? MapRelations(IEnumerable<Workflow>? related) =>
        related?.Select(r => new DashboardRelationDto(r.DatabaseId, r.OperationId, r.Status.ToString())).ToList();
}
