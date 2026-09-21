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
    int DeferCount,
    DateTimeOffset? FirstDeferredAt,
    string? LastDeferReason,
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
    // The receive workflow's marker; null on every ordinary workflow.
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
/// One position as a card shows it. <c>ParkedForSeconds</c> is null for a receiver that never parked: zero
/// would claim it waited and was released instantly.
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
/// The four states of a position. <see cref="Closed"/> is deliberately not folded into
/// <see cref="Waiting"/> (the wait is over) or <see cref="Paired"/> (there was no message).
/// </summary>
internal static class DashboardMailboxPositionState
{
    /// <summary>A message nobody has been enqueued for — an unpaired delivery.</summary>
    internal const string Delivered = "delivered";

    internal const string Paired = "paired";

    internal const string Waiting = "waiting";

    /// <summary>Released by the mailbox closing: no message ever arrived and none can.</summary>
    internal const string Closed = "closed";
}

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
    long UnpairedDeliveries,
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
            step.DeferCount,
            step.FirstDeferredAt,
            step.LastDeferReason,
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
            mailbox.UnpairedDeliveries,
            [.. snapshot.Positions.Select(MapMailboxPosition)]
        );
    }

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
    /// Names a position's state, deciding from the receiver side first. The last branch is where <c>held_at</c>
    /// earns its keep: a receiver still parked and one the closing mailbox released look identical in the
    /// workflow's status once settled.
    /// </summary>
    private static string MapMailboxPositionState(MailboxPosition position)
    {
        if (position.ReceiverWorkflowId is null)
            return DashboardMailboxPositionState.Delivered;

        if (position.AcceptedAt is not null)
            return DashboardMailboxPositionState.Paired;

        return position is { HeldAt: not null, ReleasedAt: null }
            ? DashboardMailboxPositionState.Waiting
            : DashboardMailboxPositionState.Closed;
    }

    internal static IReadOnlyList<DashboardRelationDto>? MapRelations(IEnumerable<Workflow>? related) =>
        related?.Select(r => new DashboardRelationDto(r.DatabaseId, r.OperationId, r.Status.ToString())).ToList();
}
