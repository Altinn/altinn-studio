using Altinn.Studio.AppManager.Platform.PortListeners;

namespace Altinn.Studio.AppManager.Discovery.Process;

internal sealed class ProcessDiscovery : IAppDiscovery
{
    private readonly PortListeners _portListeners;

    public ProcessDiscovery(PortListeners portListeners)
    {
        _portListeners = portListeners;
    }

    public async Task<IReadOnlyList<AppDiscoveryCandidate>> Discover(CancellationToken cancellationToken)
    {
        var candidates = new List<AppDiscoveryCandidate>();
        var listeners = await _portListeners.Get(cancellationToken);
        foreach (var listener in listeners)
        {
            if (!TryBuildProbeUri(listener, out var baseUri) || baseUri is null)
                continue;

            if (string.IsNullOrWhiteSpace(listener.ProcessName))
                continue;

            // Process names for .NET apps comes from the assembly names, these are either
            // "Altinn.App" or "Altinn.Application". This is seemingly true for both "dotnet run" and "studioctl run"
            if (!listener.ProcessName.Contains("Altinn.App", StringComparison.OrdinalIgnoreCase))
                continue;

            candidates.Add(new AppDiscoveryCandidate("process", baseUri, listener.ProcessId, listener.ProcessName));
        }

        return candidates;
    }

    private static bool TryBuildProbeUri(PortListener listener, out Uri? baseUri)
    {
        switch (listener.BindScope)
        {
            case ListenerBindScope.Loopback:
            case ListenerBindScope.Any:
                baseUri = BuildLoopbackUri(listener.Port);
                return true;
            default:
                baseUri = default;
                return false;
        }
    }

    private static Uri BuildLoopbackUri(int port) => new($"http://127.0.0.1:{port}", UriKind.Absolute);
}
