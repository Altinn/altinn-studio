namespace Altinn.Studio.StudioctlServer.Discovery;

/// <param name="FrontDoorUri">
/// Where the localtest-v2 front door reaches the app when it is not through the host gateway: a container-mode app on
/// the localtest-v2 network, at its alias (<c>http://ttd-app:5005</c>). Null for an app on the host.
/// </param>
internal sealed record DiscoveredApp(
    string AppId,
    AppEndpointUri BaseUri,
    string Source,
    int? ProcessId,
    string Description,
    string? ContainerId,
    string? Name,
    int? HostPort,
    Uri? FrontDoorUri = null
);
