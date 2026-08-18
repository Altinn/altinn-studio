using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowEngine.Data.Entities;

/// <summary>
/// One message delivered into a mailbox, occupying one position in its deliveries log.
/// </summary>
/// <remarks>
/// <strong>The position is the address.</strong> A delivery is identified by
/// <c>(mailbox_id, idx)</c> rather than by an id of its own, because that pair is exactly what the
/// receiver enqueued at the matching position looks it up by — one primary-key read, no join, no search.
/// Positions are assigned under the mailbox's row lock and are therefore gapless: position <c>n</c>
/// exists whenever position <c>n+1</c> does.
/// </remarks>
[Table("mailbox_deliveries", Schema = Constants.SchemaNames.Engine)]
internal sealed class MailboxDeliveryEntity
{
    /// <summary>
    /// Gets or sets the mailbox this delivery belongs to.
    /// </summary>
    public Guid MailboxId { get; set; }

    /// <summary>
    /// Gets or sets the delivery's gapless position in the mailbox's deliveries log.
    /// </summary>
    public long Idx { get; set; }

    /// <summary>
    /// Gets or sets the caller's key for the message, unique within the mailbox. This is what makes an
    /// at-least-once forwarder's resend land on the position it already holds instead of a new one.
    /// </summary>
    [MaxLength(200)]
    public required string IdempotencyKey { get; set; }

    /// <summary>
    /// Gets or sets the message body, stored verbatim. The engine never parses it.
    /// </summary>
    public required string Payload { get; set; }

    /// <summary>
    /// Gets or sets when the mailbox accepted the delivery.
    /// </summary>
    public DateTimeOffset AcceptedAt { get; set; }
}
