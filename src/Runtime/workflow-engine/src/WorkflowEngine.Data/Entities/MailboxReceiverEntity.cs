using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowEngine.Data.Entities;

/// <summary>
/// One receive workflow's registration at a position in a mailbox's receivers log — the other half of the
/// rendezvous, and the only place a receiver's position is written down.
/// </summary>
/// <remarks>
/// Every receiver registers, whether or not it ever waited: the row is a positional registry entry, not a wait
/// ticket, and registering only the parked ones would leave a running receiver's position recorded nowhere.
/// <see cref="MailboxReceiverEntity.HeldAt"/> is what separates the two. The two keys are the two directions
/// the row is read from — <c>(mailbox_id, seq)</c> for the wake, <c>UNIQUE (workflow_id)</c> for the executor,
/// total rather than partial so "one receiver consumes exactly one position" is a property of the schema.
/// <c>workflow_id</c> carries no foreign key: receive workflows are purged on their own schedule, and a
/// leftover row dangles nothing that anything reads.
/// </remarks>
[Table("mailbox_receivers", Schema = Constants.SchemaNames.Engine)]
internal sealed class MailboxReceiverEntity
{
    public Guid MailboxId { get; set; }

    /// <summary>
    /// Gets or sets the receiver's gapless position in the mailbox's receivers log. It is compared against the
    /// deliveries log's positions directly: the receiver at <c>seq</c> consumes the delivery at <c>idx = seq</c>.
    /// </summary>
    public long Seq { get; set; }

    public Guid WorkflowId { get; set; }

    /// <summary>
    /// Gets or sets when the receiver parked, or <c>null</c> when it was born runnable and never did. The
    /// registry's one structural distinction: it is what lets the wake-to-claim histogram measure a wake rather
    /// than a fetch cycle, and what a per-position read needs to tell "waiting" from "ran straight away" once the
    /// receiver has settled.
    /// </summary>
    public DateTimeOffset? HeldAt { get; set; }

    /// <summary>
    /// Gets or sets when the receiver became runnable — its birth, when it was born runnable; the delivery's
    /// arrival or the mailbox closing, when it had parked. <c>null</c> only while a parked receiver is still
    /// waiting. Written exactly once: both release paths skip rows that already carry a stamp.
    /// </summary>
    public DateTimeOffset? ReleasedAt { get; set; }

    /// <summary>
    /// Gets or sets when a worker first claimed the released receiver, or <c>null</c> until one does. The other end
    /// of the wake-to-claim measurement: the fetch stamps it under <c>claimed_at IS NULL</c>, so each release is
    /// timed once and a receiver that retries does not report its whole ladder as wake latency.
    /// </summary>
    public DateTimeOffset? ClaimedAt { get; set; }
}
