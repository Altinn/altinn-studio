using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

/// <summary>
/// A durable inbox. This row is the mailbox's serialization point: every mutation takes its lock as the
/// transaction's first act, and the one compound lock order is mailbox row → workflow row.
/// </summary>
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

    /// <summary>The record of what was asked for; <see cref="Deadline"/> is what binds.</summary>
    public TimeSpan Timeout { get; set; }

    public DateTimeOffset Deadline { get; set; }

    public long NextIdx { get; set; }

    public long NextSeq { get; set; }

    public MailboxStatus Status { get; set; }

    /// <summary>Null exactly while <see cref="Status"/> is <see cref="MailboxStatus.Open"/>.</summary>
    public MailboxDisposedReason? DisposedReason { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? DisposedAt { get; set; }
}
