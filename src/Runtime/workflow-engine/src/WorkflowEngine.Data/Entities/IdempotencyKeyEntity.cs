namespace WorkflowEngine.Data.Entities;

internal sealed class IdempotencyKeyEntity
{
    public required string IdempotencyKey { get; set; }

    public required string Namespace { get; set; }

    public required byte[] RequestBodyHash { get; set; }

    public required Guid[] WorkflowIds { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
