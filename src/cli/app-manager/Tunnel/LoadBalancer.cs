using System.Collections.Concurrent;
using Altinn.Studio.AppManager.Discovery;

namespace Altinn.Studio.AppManager.Tunnel;

internal sealed class LoadBalancer
{
    private readonly ConcurrentDictionary<string, RoundRobinState> _roundRobinStates = new(
        StringComparer.OrdinalIgnoreCase
    );

    public DiscoveredApp? Next(string appId, IReadOnlyList<DiscoveredApp> apps)
    {
        if (apps.Count == 0)
            return null;

        var state = _roundRobinStates.GetOrAdd(appId, static _ => new RoundRobinState());
        return apps[state.Next(apps.Count)];
    }

    private sealed class RoundRobinState
    {
        private int _next = -1;

        public int Next(int count)
        {
            return (int)((uint)Interlocked.Increment(ref _next) % (uint)count);
        }
    }
}
