using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

/// <summary>A mailbox: a durable inbox that external messages are delivered into and workflows receive from.</summary>
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
    public Guid Id { get; set; }

    [MaxLength(200)]
    public required string Namespace { get; set; }

    [MaxLength(200)]
    public required string IdempotencyKey { get; set; }

    [MaxLength(200)]
    public string? CollectionKey { get; set; }

    /// <summary>
    /// Gets or sets the timeout the mailbox was minted with. Kept as the record of what was asked for;
    /// <see cref="Deadline"/> is what binds.
    /// </summary>
    public TimeSpan Timeout { get; set; }

    public DateTimeOffset Deadline { get; set; }

    public long NextIdx { get; set; }

    public long NextSeq { get; set; }

    public MailboxStatus Status { get; set; }

    /// <summary>
    /// Gets or sets why the mailbox was closed. Null exactly while <see cref="Status"/> is
    /// <see cref="MailboxStatus.Open"/>.
    /// </summary>
    public MailboxDisposedReason? DisposedReason { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? DisposedAt { get; set; }
}
