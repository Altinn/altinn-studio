namespace Altinn.Studio.StudioctlServer.Discovery;

internal interface IAppDiscovery
{
    TimeSpan PassivePollInterval { get; }

    Task<IReadOnlyList<AppDiscoveryCandidate>> Discover(CancellationToken cancellationToken);
}
