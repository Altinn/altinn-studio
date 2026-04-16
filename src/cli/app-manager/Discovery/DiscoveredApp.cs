namespace Altinn.Studio.AppManager.Discovery;

internal sealed record DiscoveredApp(
    string AppId,
    Uri BaseUri,
    string Source,
    int? ProcessId,
    string Description,
    DateTimeOffset LastSeen
);
