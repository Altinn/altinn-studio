namespace Altinn.Studio.AppManager.Discovery;

internal sealed record DiscoveredApp(
    string AppId,
    AppEndpointUri BaseUri,
    string Source,
    int? ProcessId,
    string Description,
    string? ContainerId,
    string? Name,
    int? HostPort
);
