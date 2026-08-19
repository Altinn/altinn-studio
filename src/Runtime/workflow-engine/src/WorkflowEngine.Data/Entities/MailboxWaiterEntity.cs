using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowEngine.Data.Entities;

/// <summary>
/// One receive workflow's registration at a position in a mailbox's receivers log — the other half of
/// the rendezvous, and the only place a receiver's position is written down.
/// </summary>
/// <remarks>
/// <strong>A waiter row exists only for a receiver that had to park.</strong> A receiver born runnable —
/// because its delivery already sat at its position, or because the mailbox was already closed — has
/// nothing to wait for, so it registers nothing: its truth was frozen before it existed. The rows here
/// are exactly the set the wake and the closure release have to walk, which is what keeps both of them
/// one statement over a small table rather than a scan of <c>engine.workflows</c>.
/// <para>
/// The two keys are the two directions the row is read from. <c>(mailbox_id, seq)</c> is the wake's:
/// a delivery landing at position <em>n</em> asks who, if anyone, is waiting at <em>n</em>.
/// <c>UNIQUE (workflow_id)</c> is the executor's: a receive workflow being executed asks which position
/// it holds, and the uniqueness is also what makes "one receiver consumes exactly one position" a
/// property of the schema rather than of the code that happens to write it.
/// </para>
/// <para>
/// <c>workflow_id</c> carries no foreign key, deliberately. Receive workflows are ordinary rows purged by
/// the ordinary retention sweep, on their own schedule; a purged receiver leaves its released waiter
/// behind until the mailbox itself is purged, which dangles nothing that anything reads.
/// </para>
/// </remarks>
[Table("mailbox_waiters", Schema = Constants.SchemaNames.Engine)]
internal sealed class MailboxWaiterEntity
{
    /// <summary>
    /// Gets or sets the mailbox the receiver is waiting on.
    /// </summary>
    public Guid MailboxId { get; set; }

    /// <summary>
    /// Gets or sets the receiver's gapless position in the mailbox's receivers log. It is compared
    /// against the deliveries log's positions directly: the receiver at <c>seq</c> consumes the delivery
    /// at <c>idx = seq</c>, which is why both counters live on the same row and advance under the same
    /// lock.
    /// </summary>
    public long Seq { get; set; }

    /// <summary>
    /// Gets or sets the receive workflow parked at this position.
    /// </summary>
    public Guid WorkflowId { get; set; }

    /// <summary>
    /// Gets or sets when the receiver was released to run — by the delivery's arrival or by the mailbox
    /// closing — or <c>null</c> while it is still parked. Bookkeeping for operators and for the
    /// wake-to-claim latency measurement; the receiver's own status is the authority on whether it ran.
    /// </summary>
    /// <remarks>
    /// Written exactly once, by whichever release got there first: both release paths skip waiters that
    /// already carry a stamp, so the value always records the release that actually made the receiver
    /// runnable rather than the last statement that looked at the row.
    /// </remarks>
    public DateTimeOffset? ReleasedAt { get; set; }

    /// <summary>
    /// Gets or sets when a worker first claimed the released receiver, or <c>null</c> until one does.
    /// The other end of the wake-to-claim measurement, and the reason that measurement can be trusted:
    /// the fetch stamps it under <c>claimed_at IS NULL</c>, so each release is timed once and a receiver
    /// that fails and retries does not report its whole retry ladder as wake latency.
    /// </summary>
    public DateTimeOffset? ClaimedAt { get; set; }
}
