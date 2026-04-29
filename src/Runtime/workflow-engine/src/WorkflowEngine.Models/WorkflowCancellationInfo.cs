namespace WorkflowEngine.Models;

public sealed record WorkflowCancellationInfo(PersistentItemStatus Status, DateTimeOffset? CancellationRequestedAt);
