using System;
using System.Collections.Concurrent;

namespace Altinn.Platform.Storage.Services;

/// <inheritdoc cref="IProcessBaselineStore"/>
/// <remarks>
/// In-memory and intentionally not persisted: a missing entry makes the cleanup skip deletion
/// (fail-safe), and the entry is re-established by the very process change being handled, so a
/// restart degrades to at most one skipped cleanup per in-flight instance.
/// </remarks>
public class ProcessBaselineStore : IProcessBaselineStore
{
    private readonly ConcurrentDictionary<Guid, DateTime> _lastProcessChange = new();

    /// <inheritdoc/>
    public void StampProcessChange(Guid instanceGuid)
    {
        _lastProcessChange[instanceGuid] = DateTime.UtcNow;
    }

    /// <inheritdoc/>
    public DateTime? GetLastProcessChange(Guid instanceGuid)
    {
        return _lastProcessChange.TryGetValue(instanceGuid, out DateTime timestamp) ? timestamp : null;
    }
}
