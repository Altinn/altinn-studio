using Altinn.Studio.StudioctlServer.Platform.PortListeners;

namespace Altinn.Studio.StudioctlServer.Discovery;

internal sealed class StartupDiscovery
{
    private readonly PortListeners _portListeners;

    public StartupDiscovery(PortListeners portListeners)
    {
        _portListeners = portListeners;
    }

    public async Task<IReadOnlyList<AppDiscoveryCandidate>> Discover(
        IReadOnlyCollection<AppDiscoveryTarget> targets,
        CancellationToken cancellationToken
    )
    {
        var candidates = new List<AppDiscoveryCandidate>();
        var processTargets = new Dictionary<int, AppDiscoveryTarget>();

        foreach (var target in targets)
        {
            if (target.HostPort is { } hostPort)
            {
                if (AppEndpointUri.TryLoopbackHttp(hostPort, out var baseUri) && baseUri is not null)
                    candidates.Add(ToCandidate(target, baseUri));
                continue;
            }

            if (target.ProcessId is { } processId)
                processTargets[processId] = target;
        }

        if (processTargets.Count == 0)
            return candidates;

        var listeners = await _portListeners.GetForProcesses(processTargets.Keys.ToHashSet(), cancellationToken);
        foreach (var listener in listeners)
        {
            if (
                !processTargets.TryGetValue(listener.ProcessId, out var target)
                || !AppEndpointUri.TryFromListener(listener, out var baseUri)
                || baseUri is null
            )
                continue;

            candidates.Add(ToCandidate(target, baseUri));
        }

        return candidates;
    }

    private static AppDiscoveryCandidate ToCandidate(AppDiscoveryTarget target, Uri baseUri)
    {
        string source;
        string description;
        if (!string.IsNullOrWhiteSpace(target.ContainerId))
        {
            source = "container";
            description = $"registered container {target.ContainerId}";
        }
        else if (target.ProcessId is { } processId)
        {
            source = "process";
            description = $"registered process {processId}";
        }
        else
        {
            source = "port";
            description = $"registered port {target.HostPort}";
        }

        return new AppDiscoveryCandidate(
            source,
            baseUri,
            target.ProcessId,
            description,
            target.ContainerId,
            HostPort: target.HostPort ?? baseUri.Port
        );
    }
}

internal sealed record AppDiscoveryTarget(int? ProcessId, string? ContainerId, int? HostPort)
{
    public bool Matches(DiscoveredApp app)
    {
        if (ProcessId.HasValue && app.ProcessId != ProcessId)
            return false;

        if (
            !string.IsNullOrWhiteSpace(ContainerId)
            && !string.Equals(app.ContainerId, ContainerId, StringComparison.Ordinal)
        )
            return false;

        return !HostPort.HasValue || app.HostPort == HostPort || app.BaseUri.Port == HostPort;
    }
}
