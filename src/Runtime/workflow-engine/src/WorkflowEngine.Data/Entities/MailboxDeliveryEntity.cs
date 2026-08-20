using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowEngine.Data.Entities;

/// <summary>
/// One message delivered into a mailbox, occupying one position in its deliveries log. The position is the
/// address: a delivery is identified by <c>(mailbox_id, idx)</c> rather than by an id of its own, because that
/// pair is what the receiver at the matching position looks it up by. Positions are assigned under the
/// mailbox's row lock and are therefore gapless.
/// </summary>
[Table("mailbox_deliveries", Schema = Constants.SchemaNames.Engine)]
internal sealed class MailboxDeliveryEntity
{
    public Guid MailboxId { get; set; }

    public long Idx { get; set; }

    /// <summary>
    /// Gets or sets the caller's key for the message, unique within the mailbox. This is what makes an
    /// at-least-once forwarder's resend land on the position it already holds instead of a new one.
    /// </summary>
    [MaxLength(200)]
    public required string IdempotencyKey { get; set; }

    public required string Payload { get; set; }

    public DateTimeOffset AcceptedAt { get; set; }
}
