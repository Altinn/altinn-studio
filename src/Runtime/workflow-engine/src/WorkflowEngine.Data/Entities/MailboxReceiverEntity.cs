using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowEngine.Data.Entities;

/// <summary>
/// One receive workflow's registration at a position in a mailbox's receivers log — the other half of
/// the rendezvous, and the only place a receiver's position is written down.
/// </summary>
/// <remarks>
/// <strong>Every receiver registers, whether or not it ever waited.</strong> The row is a positional
/// registry entry, not a wait ticket: the position is what the executor reads to find its delivery, and
/// a receiver born runnable — with its delivery already at its position, or with the closed signal —
/// needs that just as much as one that parked. Registering only the parked ones would leave a running
/// receiver's position recorded nowhere, and the executor would read "no delivery at an unknown
/// position" for a message sitting in the log.
/// <para>
/// <see cref="HeldAt"/> is what separates the two. A row with a stamp there described a receiver that
/// parked, and the unreleased subset of those — <see cref="ReleasedAt"/> still null — is exactly the
/// set the wake and the closure release walk. A row without one was born runnable and released in the
/// same instant, and no release ever touches it.
/// </para>
/// <para>
/// The two keys are the two directions the row is read from. <c>(mailbox_id, seq)</c> is the wake's:
/// a delivery landing at position <em>n</em> asks who, if anyone, is waiting at <em>n</em>.
/// <c>UNIQUE (workflow_id)</c> is the executor's: a receive workflow being executed asks which position
/// it holds, and — now that every receiver registers — it is a total index rather than a partial one,
/// which is what makes "one receiver consumes exactly one position" a property of the schema rather
/// than of the code that happens to write it.
/// </para>
/// <para>
/// <c>workflow_id</c> carries no foreign key, deliberately. Receive workflows are ordinary rows purged by
/// the ordinary retention sweep, on their own schedule; a purged receiver leaves its row behind until
/// the mailbox itself is purged, which dangles nothing that anything reads.
/// </para>
/// </remarks>
[Table("mailbox_receivers", Schema = Constants.SchemaNames.Engine)]
internal sealed class MailboxReceiverEntity
{
    /// <summary>
    /// Gets or sets the mailbox the receiver reads from.
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
    /// Gets or sets the receive workflow standing at this position.
    /// </summary>
    public Guid WorkflowId { get; set; }

    /// <summary>
    /// Gets or sets when the receiver parked, or <c>null</c> when it was born runnable and never did.
    /// </summary>
    /// <remarks>
    /// The registry's one structural distinction, and it is load-bearing in two places. It is what lets
    /// the wake-to-claim histogram measure a wake rather than a fetch cycle: a receiver that never
    /// parked has no wake to time, and timing it anyway would fill a metric built to show a sub-second
    /// gap with ordinary poll latency. And it is what a per-position read needs to tell "waiting" from
    /// "ran straight away", which the status alone cannot say once the receiver has settled.
    /// </remarks>
    public DateTimeOffset? HeldAt { get; set; }

    /// <summary>
    /// Gets or sets when the receiver became runnable — its birth, when it was born runnable; the
    /// delivery's arrival or the mailbox closing, when it had parked. <c>null</c> only while a parked
    /// receiver is still waiting.
    /// </summary>
    /// <remarks>
    /// Written exactly once. For a parked receiver, both release paths skip rows that already carry a
    /// stamp, so the value records the release that actually made it runnable rather than the last
    /// statement to look at the row; for one born runnable, the enqueue flush writes it and no release
    /// ever matches the row again.
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
