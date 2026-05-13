namespace Altinn.Studio.StudioctlServer.Platform.PortListeners;

internal sealed class PortListeners
{
    private readonly IPortListenerSource _source;

    public PortListeners(IEnumerable<IPortListenerSource> sources)
    {
        _source =
            sources.FirstOrDefault(static source => source.SupportsCurrentPlatform())
            ?? throw new InvalidOperationException("no port listener source registered for current platform");
    }

    public Task<IReadOnlyList<PortListener>> Get(CancellationToken cancellationToken) => _source.Get(cancellationToken);
}
