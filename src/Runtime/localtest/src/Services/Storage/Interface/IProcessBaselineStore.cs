using System;

namespace Altinn.Platform.Storage.Services;

/// <summary>
/// Records, on this service's own clock, when each instance last had its process state changed.
/// Gives <see cref="IProcessDataCleanupService"/> a single-clock baseline: data elements created
/// after the previous process change belong to the in-flight transition, everything older is a
/// leftover from a previous visit.
/// </summary>
public interface IProcessBaselineStore
{
    /// <summary>
    /// Records that a process change for <paramref name="instanceGuid"/> was applied now.
    /// Call after every successful process update.
    /// </summary>
    void StampProcessChange(Guid instanceGuid);

    /// <summary>
    /// Returns when <paramref name="instanceGuid"/> last had a process change applied, or
    /// <c>null</c> when no change has been recorded (a fresh instance, or a restart of this
    /// service since the last change).
    /// </summary>
    DateTime? GetLastProcessChange(Guid instanceGuid);
}
