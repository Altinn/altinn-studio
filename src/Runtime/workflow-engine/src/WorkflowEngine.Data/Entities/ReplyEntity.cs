using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

[Table("Replies")]
internal sealed class ReplyEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public Guid ReplyId { get; set; }

    [ForeignKey(nameof(Step))]
    public long StepId { get; set; }
    public StepEntity? Step { get; set; }

    public string Payload { get; set; } = "{}";

    public DateTimeOffset CreatedAt { get; set; }

    public static ReplyEntity FromDomainModel(Reply reply) =>
        new()
        {
            Id = reply.DatabaseId,
            ReplyId = reply.ReplyId,
            StepId = reply.StepId,
            Payload = reply.Payload,
            CreatedAt = reply.CreatedAt,
        };

    public Reply ToDomainModel() =>
        new()
        {
            DatabaseId = Id,
            ReplyId = ReplyId,
            StepId = StepId,
            Payload = Payload,
            CreatedAt = CreatedAt,
        };
}
