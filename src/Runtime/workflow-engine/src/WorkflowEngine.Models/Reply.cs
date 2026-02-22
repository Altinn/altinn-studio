namespace WorkflowEngine.Models;

/// <summary>
/// Represents a reply received from an external party for a suspended step.
/// </summary>
public sealed record Reply
{
    /// <summary>
    /// The database-generated primary key.
    /// </summary>
    public long DatabaseId { get; set; }

    /// <summary>
    /// Unique identifier for this reply.
    /// </summary>
    public required Guid ReplyId { get; init; }

    /// <summary>
    /// Links to the Step's DatabaseId.
    /// </summary>
    public required long StepId { get; init; }

    /// <summary>
    /// The reply payload (JSON string).
    /// </summary>
    public required string Payload { get; init; }

    /// <summary>
    /// When the reply was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; init; }
}
