using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

[Table("Replies", Schema = Constants.SchemaNames.Engine)]
internal sealed class ReplyEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public Guid Id { get; set; }

    public Guid StepId { get; set; }

    public string? Payload { get; set; }

    public DateTimeOffset? ReceivedAt { get; set; }

    /// <summary>
    /// Caller-supplied idempotency key from the Idempotency-Key HTTP header.
    /// NULL for pre-created (not yet submitted) replies.
    /// </summary>
    public string? IdempotencyKey { get; set; }

    /// <summary>
    /// SHA-256 hash of the payload, set when the reply is submitted.
    /// Used together with <see cref="IdempotencyKey"/> to detect conflicting re-submissions.
    /// </summary>
    [Column(TypeName = "bytea")]
    public byte[]? PayloadHash { get; set; }

    public static ReplyEntity FromDomainModel(Reply reply) =>
        new()
        {
            Id = reply.DatabaseId,
            StepId = reply.StepId,
            Payload = reply.Payload,
            ReceivedAt = reply.ReceivedAt,
        };

    public Reply ToDomainModel() =>
        new()
        {
            DatabaseId = Id,
            StepId = StepId,
            Payload = Payload,
            ReceivedAt = ReceivedAt,
        };
}
