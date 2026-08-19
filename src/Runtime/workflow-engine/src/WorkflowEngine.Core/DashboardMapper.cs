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
    // Null on every ordinary workflow: it is the receive workflow's marker, and what lets a card be
    // matched to the mailbox block it reads from without a second lookup.
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
/// One position of a mailbox's log as a dashboard card shows it.
/// </summary>
/// <param name="Position">The shared position of the two logs — a delivery's <c>idx</c>, a receiver's <c>seq</c>.</param>
/// <param name="State">
/// The position in one word: see <see cref="DashboardMailboxPositionState"/> for what each means.
/// </param>
/// <param name="DeliveryKey">
/// The forwarding source's own message id, when a message stands here. It is what an operator matches
/// against the sending system's logs, which is the whole reason it is on a card rather than only the
/// position.
/// </param>
/// <param name="AcceptedAt">When the engine accepted the message standing here.</param>
/// <param name="ReceiverWorkflowId">The receive workflow holding this position, when one does — the link.</param>
/// <param name="HeldAt">When the receiver parked here, or null when it was born runnable.</param>
/// <param name="ReleasedAt">When the receiver became runnable — its birth, or its release.</param>
/// <param name="ClaimedAt">When a worker first claimed the released receiver.</param>
/// <param name="ParkedForSeconds">
/// How long the receiver was parked before it was released, or has been parked so far when it still is.
/// Null for a receiver that never parked, which is what makes the number readable: zero would claim it
/// waited and was released instantly.
/// </param>
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
/// </summary>
/// <remarks>
/// The proposal names three — delivered, consumed, waiting. <see cref="Closed"/> is the fourth, and it
/// is neither of the two it could have been folded into: a receiver released by the mailbox closing is
/// not <see cref="Waiting"/>, because its wait is over, and it is not <see cref="Consumed"/>, because it
/// was handed the closing signal rather than a message. Folding it either way would misreport the
/// ordinary end of an exchange that timed out — the case an operator opens the dashboard for.
/// </remarks>
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

    /// <summary>
    /// Projects one mailbox snapshot into its card shape.
    /// </summary>
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

    /// <summary>
    /// Projects one position into its card shape, naming the state it is in.
    /// </summary>
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
    /// distinguishes the three states a receiver can be in.
    /// </summary>
    /// <remarks>
    /// A position with no receiver is a message nobody has been enqueued for, and there is no other reason
    /// for such a position to exist: the read builds its positions from the rows of the two logs, so a
    /// position with neither a message nor a receiver at it is not something it can return. That is pinned
    /// against a real database rather than defended here, where the check could only be dead code.
    /// <para>
    /// The last branch is where <c>held_at</c> earns its keep. A receiver with no message that is still
    /// parked and one that the closing mailbox released look identical in the workflow's status once it has
    /// settled, and telling them apart is the difference between "this exchange is waiting on a
    /// counterparty" and "this exchange gave up".
    /// </para>
    /// </remarks>
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
