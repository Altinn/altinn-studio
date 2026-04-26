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
            if (!AppEndpointUri.TryFromListener(listener, out var baseUri) || baseUri is null)
                continue;

            var name = StudioAppName(listener);
            if (name is null)
                continue;

            candidates.Add(
                new AppDiscoveryCandidate(
                    "process",
                    baseUri,
                    listener.ProcessId,
                    name,
                    Name: name,
                    HostPort: listener.Port
                )
            );
        }

        return candidates;
    }

    private static string? StudioAppName(PortListener listener)
    {
        if (IsStudioAppName(listener.ProcessName))
            return listener.ProcessName;

        return IsStudioAppName(listener.CommandLine) ? listener.CommandLine : null;
    }

    private static bool IsStudioAppName(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && (
            value.Contains("Altinn.App", StringComparison.OrdinalIgnoreCase)
            || value.Contains("Altinn.Application", StringComparison.OrdinalIgnoreCase)
        );
}
