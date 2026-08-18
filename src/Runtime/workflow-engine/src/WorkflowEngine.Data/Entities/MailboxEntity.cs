using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

/// <summary>
/// A mailbox: a durable inbox that external messages are delivered into and workflows receive from.
/// </summary>
/// <remarks>
/// <strong>This row is the mailbox's serialization point.</strong> Every operation that changes mailbox
/// state — closure now, delivery ingestion and receiver enqueue later — takes this row's lock as the
/// first act of its transaction, and the row carries the counters, status and deadline those operations
/// decide with. The one compound lock order in the design is mailbox row → workflow row; nothing takes
/// them in the reverse order.
/// </remarks>
[Table("mailboxes", Schema = Constants.SchemaNames.Engine)]
internal sealed class MailboxEntity
{
    /// <summary>
    /// Gets or sets the engine-generated mailbox id (uuidv7), which is also the reply address.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the owning namespace.
    /// </summary>
    [MaxLength(200)]
    public required string Namespace { get; set; }

    /// <summary>
    /// Gets or sets the caller's mint key, unique within the namespace.
    /// </summary>
    [MaxLength(200)]
    public required string IdempotencyKey { get; set; }

    /// <summary>
    /// Gets or sets the workflow-collection key the mailbox is grouped under, when one was supplied.
    /// </summary>
    [MaxLength(200)]
    public string? CollectionKey { get; set; }

    /// <summary>
    /// Gets or sets the timeout the mailbox was minted with. Kept as the record of what was asked for;
    /// <see cref="Deadline"/> is what binds.
    /// </summary>
    public TimeSpan Timeout { get; set; }

    /// <summary>
    /// Gets or sets the absolute instant the mailbox stops accepting deliveries.
    /// </summary>
    public DateTimeOffset Deadline { get; set; }

    /// <summary>
    /// Gets or sets the next position the deliveries log will assign.
    /// </summary>
    public long NextIdx { get; set; }

    /// <summary>
    /// Gets or sets the next position the receivers log will assign.
    /// </summary>
    public long NextSeq { get; set; }

    /// <summary>
    /// Gets or sets the lifecycle status.
    /// </summary>
    public MailboxStatus Status { get; set; }

    /// <summary>
    /// Gets or sets why the mailbox was closed. Null exactly while <see cref="Status"/> is
    /// <see cref="MailboxStatus.Open"/>.
    /// </summary>
    public MailboxDisposedReason? DisposedReason { get; set; }

    /// <summary>
    /// Gets or sets when the mailbox was minted.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets when the mailbox was closed, when it has been.
    /// </summary>
    public DateTimeOffset? DisposedAt { get; set; }
}
