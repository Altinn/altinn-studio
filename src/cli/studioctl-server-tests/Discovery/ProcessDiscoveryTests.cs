using Altinn.Studio.StudioctlServer.Discovery.Process;
using Altinn.Studio.StudioctlServer.Platform.PortListeners;

namespace Studioctl.Tests.Discovery;

public sealed class ProcessDiscoveryTests
{
    [Fact]
    public async Task Discover_WithKnownPid_IncludesListenerWithoutProcessMetadata()
    {
        var discovery = new ProcessDiscovery(
            new PortListeners([
                new FakePortListenerSource([
                    new PortListener(22808, 5100, ListenerBindScope.Loopback),
                    new PortListener(42, 5200, ListenerBindScope.Loopback),
                ]),
            ])
        );

        Assert.Empty(await discovery.Discover(TestContext.Current.CancellationToken));

        var candidate = Assert.Single(
            await discovery.Discover(new HashSet<int> { 22808 }, TestContext.Current.CancellationToken)
        );
        Assert.Equal(22808, candidate.ProcessId);
        Assert.Equal(new Uri("http://127.0.0.1:5100/"), candidate.BaseUri);
    }

    private sealed class FakePortListenerSource(IReadOnlyList<PortListener> listeners) : IPortListenerSource
    {
        public bool SupportsCurrentPlatform() => true;

        public Task<IReadOnlyList<PortListener>> Get(CancellationToken cancellationToken) => Task.FromResult(listeners);
    }
}
