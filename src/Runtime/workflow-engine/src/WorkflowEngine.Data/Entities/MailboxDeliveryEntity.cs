using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowEngine.Data.Entities;

/// <summary>
/// One message at one position. The position is the address — the pair <c>(mailbox_id, idx)</c> is what
/// the receiver at the matching position looks it up by — and positions are gapless.
/// </summary>
[Table("mailbox_deliveries", Schema = Constants.SchemaNames.Engine)]
internal sealed class MailboxDeliveryEntity
{
    public Guid MailboxId { get; set; }

    public long Idx { get; set; }

    [MaxLength(200)]
    public required string IdempotencyKey { get; set; }

    public required string Payload { get; set; }

    public DateTimeOffset AcceptedAt { get; set; }
}
