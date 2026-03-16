using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowEngine.Data.Entities;

[Table("IdempotencyKeys")]
internal sealed class IdempotencyKeyEntity
{
    public required string IdempotencyKey { get; set; }

    public required string Namespace { get; set; }

    [Column(TypeName = "bytea")]
    public required byte[] RequestBodyHash { get; set; }

    [Column(TypeName = "uuid[]")]
    public required Guid[] WorkflowIds { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
