namespace Altinn.Studio.AppManager.Platform.PortListeners;

internal interface IPortListenerSource
{
    bool SupportsCurrentPlatform();

    Task<IReadOnlyList<PortListener>> Get(CancellationToken cancellationToken);
}
