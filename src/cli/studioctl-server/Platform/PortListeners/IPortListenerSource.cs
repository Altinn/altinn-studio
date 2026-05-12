namespace Altinn.Studio.StudioctlServer.Platform.PortListeners;

internal interface IPortListenerSource
{
    bool SupportsCurrentPlatform();

    Task<IReadOnlyList<PortListener>> Get(CancellationToken cancellationToken);
}
