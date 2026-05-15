namespace Altinn.Studio.StudioctlServer.Discovery;

internal interface IAppDiscovery
{
    Task<IReadOnlyList<AppDiscoveryCandidate>> Discover(CancellationToken cancellationToken);
}
