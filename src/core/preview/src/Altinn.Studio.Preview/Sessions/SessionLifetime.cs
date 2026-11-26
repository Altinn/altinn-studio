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
    /// How long a session that started at <paramref name="startedAt"/> lasts from <paramref name="now"/>, if no other
    /// request comes, or <c>null</c> when it has ended.
    /// </summary>
    public static TimeSpan? TimeToLive(DateTimeOffset startedAt, DateTimeOffset now)
    {
        TimeSpan left = startedAt + Maximum - now;
        if (left <= TimeSpan.Zero)
        {
            return null;
        }

        return left < Idle ? left : Idle;
    }
}
