using System;
using System.Collections.Concurrent;

namespace Altinn.App.Code;

/// <summary>
/// Process-static attempt counter for the transition-control levers.
///
/// Data changes made by a hook are NOT saved when the hook fails, so we cannot persist an
/// attempt counter in the instance data to drive "fail N times then succeed". Instead we track
/// attempts in memory, keyed by "{instanceGuid}:{phase}", incremented once per hook invocation.
/// This lives for the lifetime of the app process, which is all the e2e/test scenarios need.
/// </summary>
public static class AttemptTracker
{
    private static readonly ConcurrentDictionary<string, int> _attempts = new();

    /// <summary>
    /// Returns the attempt number for this (instance, phase) pair, starting at 1 on the first call
    /// and incrementing by one on every subsequent call.
    /// </summary>
    public static int Next(Guid instanceGuid, string phase)
    {
        string key = $"{instanceGuid}:{phase}";
        return _attempts.AddOrUpdate(key, 1, (_, current) => current + 1);
    }
}
