namespace WorkflowEngine.Models;

/// <summary>
/// Point-in-time status snapshot of a workflow: the lifecycle status and the timestamp of the
/// transition that produced it (<c>UpdatedAt</c>; <c>null</c> only for rows never updated since enqueue).
/// </summary>
public sealed record WorkflowStatusInfo(PersistentItemStatus Status, DateTimeOffset? UpdatedAt);
