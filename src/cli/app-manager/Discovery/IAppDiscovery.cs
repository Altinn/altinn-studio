namespace Altinn.Studio.AppManager.Discovery;

internal interface IAppDiscovery
{
    Task<IReadOnlyList<AppDiscoveryCandidate>> Discover(CancellationToken cancellationToken);
}
