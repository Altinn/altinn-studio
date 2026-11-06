using Microsoft.Extensions.Caching.Distributed;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// How long a session lasts. Its URL ends up in logs, so it ends soon after the developer stops using it, and in any
/// case a day after it started.
/// </summary>
internal static class SessionLifetime
{
    /// <summary>A session ends this long after its last request.</summary>
    public static readonly TimeSpan Idle = TimeSpan.FromMinutes(30);

    /// <summary>A session ends this long after it started, however often it is used.</summary>
    public static readonly TimeSpan Maximum = TimeSpan.FromHours(24);

    /// <summary>
    /// The cache entry for a session that started at <paramref name="startedAt"/>. Each read of the entry restarts
    /// its idle time, up to the maximum.
    /// </summary>
    public static DistributedCacheEntryOptions EntryFor(DateTimeOffset startedAt) =>
        new() { SlidingExpiration = Idle, AbsoluteExpiration = startedAt + Maximum };
}
