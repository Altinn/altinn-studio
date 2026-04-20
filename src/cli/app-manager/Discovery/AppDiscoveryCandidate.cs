namespace Altinn.Studio.AppManager.Discovery;

internal sealed record AppDiscoveryCandidate(
    string Source,
    Uri BaseUri,
    int? ProcessId,
    string Description,
    string? ContainerId = null,
    string? Name = null,
    int? HostPort = null
);
