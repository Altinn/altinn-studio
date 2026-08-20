using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowEngine.Data.Entities;

/// <summary>
/// One receive workflow's registration at a position — the only place a receiver's position is written
/// down. Every receiver registers, parked or not; <see cref="HeldAt"/> separates the two. Keys:
/// <c>(mailbox_id, seq)</c> for the wake, <c>UNIQUE (workflow_id)</c> for the executor. <c>workflow_id</c>
/// carries no foreign key — receivers are purged on their own schedule.
/// </summary>
[Table("mailbox_receivers", Schema = Constants.SchemaNames.Engine)]
internal sealed class MailboxReceiverEntity
{
    public Guid MailboxId { get; set; }

    /// <summary>The receiver at <c>seq</c> consumes the delivery at <c>idx = seq</c>.</summary>
    public long Seq { get; set; }

    public Guid WorkflowId { get; set; }

    /// <summary>
    /// When the receiver parked; <c>null</c> when it was born runnable. What keeps the wake-to-claim histogram
    /// measuring a wake, and what tells "waiting" from "ran straight away" after settlement.
    /// </summary>
    public DateTimeOffset? HeldAt { get; set; }

    /// <summary>
    /// When the receiver became runnable; <c>null</c> only while parked. Written exactly once: both release
    /// paths skip rows that already carry a stamp.
    /// </summary>
    public DateTimeOffset? ReleasedAt { get; set; }

    /// <summary>
    /// When a worker first claimed the released receiver. Stamped under <c>claimed_at IS NULL</c>, so each
    /// release is timed once.
    /// </summary>
    public DateTimeOffset? ClaimedAt { get; set; }
}
