using System.Collections.Concurrent;

namespace WorkflowEngine.Core;

/// <summary>
/// Thread-safe tracker of workflow IDs currently being processed by this host instance.
/// Used by <see cref="HeartbeatService"/> to batch-update heartbeats and by
/// <see cref="WorkflowProcessor"/> to register/unregister in-flight work.
/// </summary>
internal sealed class InFlightTracker
{
    private readonly ConcurrentDictionary<Guid, byte> _workflows = new();

    public bool IsEmpty => _workflows.IsEmpty;

    public bool TryAdd(Guid workflowId) => _workflows.TryAdd(workflowId, 0);

    public bool TryRemove(Guid workflowId) => _workflows.TryRemove(workflowId, out _);

    public IReadOnlyList<Guid> GetSnapshotIds() => [.. _workflows.Keys];
}
