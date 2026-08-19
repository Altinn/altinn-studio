using WorkflowEngine.Models;

// CA1716: Identifiers should not match keywords (https://github.com/dotnet/roslyn-analyzers/issues/1858)
#pragma warning disable CA1716

namespace WorkflowEngine.Data.Repository;

internal interface IEngineRepository
{
    /// <summary>
    /// Gets active workflows with cursor-based pagination.
    /// Results are ordered by ID (UUIDv7 = chronological). Pass the <paramref name="cursor"/> from
    /// <see cref="CursorPaginatedResult.NextCursor"/> to fetch the next page.
    /// Set <paramref name="includeTotalCount"/> to true to include the total count (adds a COUNT query).
    /// </summary>
    Task<CursorPaginatedResult> GetActiveWorkflows(
        int pageSize,
        Guid? cursor = null,
        bool includeTotalCount = false,
        string? collectionKey = null,
        string? ns = null,
        IReadOnlyDictionary<string, string>? labelFilters = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets scheduled workflows with cursor-based pagination.
    /// Results are ordered by ID (UUIDv7 = chronological). Pass the <paramref name="cursor"/> from
    /// <see cref="CursorPaginatedResult.NextCursor"/> to fetch the next page.
    /// </summary>
    Task<CursorPaginatedResult> GetScheduledWorkflows(
        int pageSize,
        Guid? cursor = null,
        string? ns = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Queries workflows by status with cursor-based pagination (ID DESC = newest first).
    /// Replaces both <c>GetFinishedWorkflows</c> and <c>QueryWorkflowsWithCount</c>.
    /// Set <paramref name="includeTotalCount"/> to true to include the total count (adds a COUNT query).
    /// </summary>
    Task<CursorPaginatedResult> QueryWorkflows(
        int pageSize,
        IReadOnlyCollection<PersistentItemStatus> statuses,
        Guid? cursor = null,
        bool includeTotalCount = false,
        string? search = null,
        DateTimeOffset? since = null,
        bool retriedOnly = false,
        Dictionary<string, string>? labelFilters = null,
        string? namespaceFilter = null,
        string? collectionKey = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets distinct values for a given label key, optionally filtered by namespace.
    /// </summary>
    Task<IReadOnlyList<string>> GetDistinctLabelValues(
        string labelKey,
        string? ns = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets all distinct namespace values across all workflows, ordered alphabetically.
    /// </summary>
    Task<IReadOnlyList<string>> GetDistinctNamespaces(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of active workflows.
    /// </summary>
    Task<int> CountActiveWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of workflows the fetch gate could claim right now — active workflows minus
    /// those parked behind a future <c>StartAt</c> or <c>BackoffUntil</c>. Unlike
    /// <see cref="CountActiveWorkflows"/> this reaching zero means the engine is quiescent: a parked
    /// workflow holds no lease and no transaction, and will not wake on its own before its timer.
    /// </summary>
    Task<int> CountRunnableWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of scheduled workflows.
    /// </summary>
    Task<int> CountScheduledWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of failed workflows.
    /// </summary>
    Task<int> CountFailedWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of successfully completed workflows.
    /// </summary>
    Task<int> CountSuccessfulWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets workflow counts grouped by status in a single query, plus a separate count
    /// of scheduled workflows (enqueued with <c>StartAt</c> in the future).
    /// Uses an index-only scan on <c>IX_Workflows_Status</c> — much cheaper than
    /// running individual count queries with joins and subqueries.
    /// </summary>
    Task<WorkflowStatusCounts> CountWorkflowsByStatus(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the status of a workflow by its database ID and namespace, or null if not found.
    /// </summary>
    Task<PersistentItemStatus?> GetWorkflowStatus(
        Guid workflowId,
        string ns,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the status of a workflow together with the timestamp of the transition that produced
    /// it (<c>UpdatedAt</c>), or null if not found. Used by the abandon endpoint's idempotent
    /// replay path to report the original abandonment time rather than the replay time.
    /// </summary>
    Task<WorkflowStatusInfo?> GetWorkflowStatusInfo(
        Guid workflowId,
        string ns,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the full workflow (with steps) by database ID and namespace, or null if not found.
    /// </summary>
    Task<Workflow?> GetWorkflow(Guid workflowId, string ns, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the root workflow plus every workflow it can reach — directly or transitively,
    /// upstream or downstream — through dependency or link relations within <paramref name="ns"/>.
    /// Each returned <see cref="Workflow"/> has its steps, dependencies, dependents, and links
    /// eagerly loaded. Ordered by <c>CreatedAt</c>, then <c>Id</c>. Returns <c>null</c> if the
    /// root workflow does not exist in the given namespace. When <paramref name="limit"/> is set
    /// and the connected component is larger, only the most recently created workflows are
    /// hydrated and returned (the cap is applied before eager loading).
    /// </summary>
    Task<IReadOnlyList<Workflow>?> GetWorkflowDependencyGraph(
        Guid workflowId,
        string ns,
        int? limit = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates a workflow in the repository.
    /// </summary>
    Task UpdateWorkflow(Workflow workflow, bool updateTimestamp = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the specified step in the workflow repository.
    /// </summary>
    Task UpdateStep(Step step, bool updateTimestamp = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Batch-enqueues workflows with idempotency checking, COPY BINARY bulk insert, and dependency validation.
    /// </summary>
    Task<BatchEnqueueResult[]> BatchEnqueueWorkflows(
        IReadOnlyList<BufferedEnqueueRequest> requests,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Atomically fetches and locks available workflows for processing using FOR UPDATE SKIP LOCKED.
    /// Stale workflow reclaim and poisoned finalization run as separate sweeps in
    /// <c>DbMaintenanceService</c>; reclaimed rows re-enter this fetch as <c>Enqueued</c>.
    /// </summary>
    Task<List<Workflow>> FetchAndLockWorkflows(int count, CancellationToken cancellationToken);

    /// <summary>
    /// Sets the <c>CancellationRequestedAt</c> flag on a workflow.
    /// Only affects workflows that are not already in a terminal state and not already flagged for cancellation.
    /// Returns true if the workflow was found and updated.
    /// </summary>
    Task<bool> RequestCancellation(
        Guid workflowId,
        string ns,
        DateTimeOffset requestedAt,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns the status and cancellation timestamp for a workflow, or null if the workflow does not exist.
    /// Used by the cancel endpoint to distinguish "already cancelling" from "already terminal" and "not found".
    /// </summary>
    Task<WorkflowCancellationInfo?> GetCancellationInfo(
        Guid workflowId,
        string ns,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns the subset of <paramref name="inFlightIds"/> that have a non-null <c>CancellationRequestedAt</c>.
    /// Used by <c>WorkflowEngine.Core.CancellationWatcherService</c> for cross-pod cancellation propagation.
    /// </summary>
    Task<IReadOnlyList<Guid>> GetPendingCancellations(
        IReadOnlyList<Guid> inFlightIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Batch-updates HeartbeatAt for all specified workflow leases in a single statement.
    /// Used by the processor to prove liveness of in-flight workers.
    /// Skips workflows whose <c>UpdatedAt</c> is newer than <paramref name="staleThreshold"/> —
    /// a recent status write already proves liveness.
    /// Rows are only updated when the caller's <c>LeaseToken</c> matches the current value on the row;
    /// stale-token heartbeats silently no-op so a reclaimed row goes back to <c>HeartbeatAt</c> aging
    /// and remains stale-recoverable.
    /// </summary>
    Task BatchUpdateHeartbeats(
        IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)> leases,
        TimeSpan staleThreshold,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Batch-updates multiple workflows and their dirty steps in a single transaction using raw SQL.
    /// Each workflow is only written when its <c>LeaseToken</c> still matches the value on the row —
    /// workflows that have been reclaimed by another host are silently rejected and their step updates
    /// are skipped. Returns the accepted/rejected split; callers should fault the corresponding
    /// submit-waiters with <c>LeaseLostException</c> on rejected ids.
    /// </summary>
    Task<BatchUpdateResult> BatchUpdateWorkflowsAndSteps(
        IReadOnlyList<BatchWorkflowStatusUpdate> updates,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Resumes a terminal workflow (Failed, Canceled, DependencyFailed, Abandoned) or a Requeued workflow
    /// by resetting it and its non-completed steps back to Enqueued. Clears CancellationRequestedAt,
    /// BackoffUntil, HeartbeatAt, and ReclaimCount. When <paramref name="cascade"/> is true, also resumes
    /// any transitively dependent workflows that are in DependencyFailed state.
    /// Returns the list of all resumed workflow IDs (primary + cascaded), or empty if
    /// the target workflow was not in a resumable state.
    /// </summary>
    Task<IReadOnlyList<Guid>> ResumeWorkflow(
        Guid workflowId,
        string ns,
        DateTimeOffset resumedAt,
        bool cascade = false,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Marks an unsuccessful terminal workflow (Failed, Canceled, DependencyFailed) as Abandoned —
    /// its failure is written off and it no longer condemns dependents evaluated after the marking.
    /// Compare-and-set: returns <c>true</c> only when the workflow was in one of the three source
    /// states; any other status (including non-terminal after a concurrent resume) is a no-op
    /// returning <c>false</c>.
    /// Atomically with the transition, releases the idempotency key that created the workflow:
    /// re-enqueueing with the same fingerprint creates a fresh workflow instead of deduplicating
    /// onto the write-off. For batch enqueues the key covers the whole batch, so abandoning any
    /// member releases the fingerprint for all of them.
    /// </summary>
    Task<bool> AbandonWorkflow(
        Guid workflowId,
        string ns,
        DateTimeOffset abandonedAt,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Clears BackoffUntil on a parked workflow so it becomes claimable by the fetch gate at once —
    /// resuming retries for <c>Requeued</c>, or re-checking the awaited outcome for <c>Waiting</c>.
    /// Returns true only if the workflow was found, is in one of those two states, and had a non-null
    /// BackoffUntil; false is a no-op, not an error.
    /// </summary>
    Task<bool> ClearBackoff(Guid workflowId, string ns, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all workflow collections in a namespace.
    /// </summary>
    Task<IReadOnlyList<WorkflowCollectionResponse>> GetCollections(
        string ns,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets a single workflow collection by key and namespace, including head workflow statuses.
    /// </summary>
    Task<WorkflowCollectionDetailResponse?> GetCollection(
        string key,
        string ns,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Mints a mailbox with the caller-generated <paramref name="mailboxId"/>, stamping its absolute
    /// deadline as <paramref name="now"/> plus <paramref name="timeout"/>.
    /// Idempotent on <c>(namespace, idempotencyKey)</c>: a key that already minted a mailbox returns
    /// that mailbox unchanged, and does so even when the collection is at its cap — refusing a replay
    /// would strand a caller that has already published the mailbox id.
    /// A genuinely new mailbox in a named collection is refused with
    /// <see cref="MailboxMintResult.AtCollectionCapacity"/> once the collection holds
    /// <paramref name="maxOpenPerCollection"/> open mailboxes. A mailbox minted without a collection key
    /// is not capped — there is no collection to count it against.
    /// </summary>
    Task<MailboxMintResult> MintMailbox(
        Guid mailboxId,
        string ns,
        string idempotencyKey,
        string? collectionKey,
        TimeSpan timeout,
        DateTimeOffset now,
        int maxOpenPerCollection,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets a mailbox by id within a namespace, or null when it does not exist there.
    /// </summary>
    Task<MailboxResponse?> GetMailbox(Guid mailboxId, string ns, CancellationToken cancellationToken = default);

    /// <summary>
    /// Reads what the rendezvous produced for a receive workflow: the position it holds, and the message
    /// standing there or the closure that means none ever will.
    /// </summary>
    /// <remarks>
    /// Takes no lock and writes nothing. Delivery existence at a receiver's position is frozen before the
    /// receiver can first run, so the answer is stable by construction and every attempt, retry and
    /// resume re-derives the same one from the same rows.
    /// </remarks>
    Task<MailboxReceiptResult> ReadMailboxReceipt(Guid workflowId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Closes a mailbox for deliveries, taking its row lock as the transaction's first act.
    /// Idempotent: an already-closed mailbox is returned as it stands, carrying the reason and instant
    /// of the close that actually happened rather than this call's.
    /// </summary>
    Task<MailboxCloseResult> CloseMailbox(
        Guid mailboxId,
        string ns,
        MailboxDisposedReason reason,
        DateTimeOffset now,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Appends one message to a mailbox's deliveries log at the next gapless position, taking the
    /// mailbox's row lock as the transaction's first act.
    /// </summary>
    /// <remarks>
    /// Idempotent on <c>(mailboxId, idempotencyKey)</c>, and the lookup runs <em>before</em> the refusals:
    /// a message the mailbox already holds is reported as
    /// <see cref="MailboxDeliveryResult.Duplicate"/> even once the mailbox has closed or its log has
    /// filled, because the engine kept it and a caller must never be told to dead-letter a message that
    /// is sitting at a position waiting to be read. Refusals — closed mailbox, or a log already at
    /// <paramref name="maxLogLength"/> — write nothing, so they leave no key claimed and repeat
    /// identically.
    /// <para>
    /// Payload size is not checked here: it needs no row state, and refusing it before the database is
    /// what keeps an oversized delivery from costing a connection and a transaction.
    /// </para>
    /// </remarks>
    Task<MailboxDeliveryResult> DeliverToMailbox(
        Guid mailboxId,
        string ns,
        string idempotencyKey,
        string payload,
        DateTimeOffset now,
        int maxLogLength,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Closes every open mailbox whose deadline has passed, up to <paramref name="batchSize"/> of them,
    /// running exactly the routine <see cref="CloseMailbox"/> runs with
    /// <see cref="MailboxDisposedReason.Deadline"/>.
    /// </summary>
    /// <remarks>
    /// One transaction per mailbox, each opened by a <c>FOR UPDATE SKIP LOCKED</c> claim that <em>is</em>
    /// the mailbox row lock the routine requires — so a mailbox somebody else is already working on is
    /// left for the next pass rather than waited on, and a mailbox a <c>DELETE</c> closed first is simply
    /// not claimed.
    /// <para>
    /// A close that throws is contained to its own mailbox, which stays open and overdue and is claimed
    /// again by the next pass. It is never allowed to abandon the rest of the batch: the candidates are
    /// ordered by deadline, so one mailbox that always throws would otherwise lead every batch forever and
    /// wedge the deadline guarantee for every exchange behind it.
    /// </para>
    /// <para>
    /// The sweep only ever closes. Nothing is enqueued, because the receiver that concludes an exchange
    /// already exists and carries the app's own steps — closing releases it rather than creating it.
    /// </para>
    /// </remarks>
    Task<MailboxSweepResult> SweepOverdueMailboxes(
        DateTimeOffset now,
        int batchSize,
        CancellationToken cancellationToken = default
    );
}
