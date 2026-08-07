using System.Net;
using System.Text;
using Altinn.Studio.StudioctlServer.Discovery;
using Altinn.Studio.StudioctlServer.Platform.PortListeners;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Studioctl.Tests.Discovery;

public sealed class StartupDiscoveryTests
{
    [Fact]
    public async Task Discover_ProcessTarget_UsesListenersWithoutPassiveProcessMetadata()
    {
        var source = new FakePortListenerSource([
            new PortListener(22808, 5100, ListenerBindScope.Loopback),
            new PortListener(42, 5200, ListenerBindScope.Loopback, "Altinn.App"),
        ]);
        var discovery = new StartupDiscovery(new PortListeners([source]));

        var candidates = await discovery.Discover(
            [new AppDiscoveryTarget(ProcessId: 22808, ContainerId: null, HostPort: null)],
            TestContext.Current.CancellationToken
        );

        var candidate = Assert.Single(candidates);
        Assert.Equal(new Uri("http://127.0.0.1:5100/"), candidate.BaseUri);
        Assert.Equal(22808, candidate.ProcessId);
        Assert.Equal("process", candidate.Source);
        Assert.Equal([22808], source.RequestedProcessIds);
        Assert.False(source.PassiveDiscoveryCalled);
    }

    [Fact]
    public async Task Discover_HostPortTarget_DoesNotEnumerateProcesses()
    {
        var source = new FakePortListenerSource([]);
        var discovery = new StartupDiscovery(new PortListeners([source]));

        var candidates = await discovery.Discover(
            [new AppDiscoveryTarget(ProcessId: null, ContainerId: "container-id", HostPort: 5300)],
            TestContext.Current.CancellationToken
        );

        var candidate = Assert.Single(candidates);
        Assert.Equal(new Uri("http://127.0.0.1:5300/"), candidate.BaseUri);
        Assert.Equal("container-id", candidate.ContainerId);
        Assert.Equal("container", candidate.Source);
        Assert.Null(source.RequestedProcessIds);
        Assert.False(source.PassiveDiscoveryCalled);
    }

    [Fact]
    public async Task AppStarted_ProcessTarget_CompletesWithoutPassiveProcessClassification()
    {
        const string appId = "ttd/test-app";
        var source = new FakePortListenerSource(
            [new PortListener(22808, 5100, ListenerBindScope.Loopback)],
            targetExceptions: 1,
            emptyTargetResponses: 1
        );
        var passiveDiscovery = new FakePassiveDiscovery();
        var httpClientFactory = new FakeHttpClientFactory(appId);
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Localtest:Url"] = "http://127.0.0.1:8000" })
            .Build();
        var registry = new AppRegistry(
            [passiveDiscovery],
            new StartupDiscovery(new PortListeners([source])),
            new AppMetadataProbe(httpClientFactory, NullLogger<AppMetadataProbe>.Instance),
            new LocaltestStorageProbe(configuration, httpClientFactory, NullLogger<LocaltestStorageProbe>.Instance),
            NullLogger<AppRegistry>.Instance
        );
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        await registry.StartAsync(timeout.Token);
        try
        {
            var baseUri = await registry.AppStarted(
                appId,
                processId: 22808,
                containerId: null,
                hostPort: null,
                TimeSpan.FromSeconds(3),
                timeout.Token
            );

            Assert.Equal(new Uri("http://127.0.0.1:5100/"), baseUri);
            Assert.Contains(registry.GetAll(), app => app.AppId == appId && app.ProcessId == 22808);
            Assert.Equal(1, passiveDiscovery.CallCount);
            Assert.Equal([22808], source.RequestedProcessIds);
            Assert.True(source.TargetedCallCount >= 3);
            Assert.False(source.PassiveDiscoveryCalled);

            var removed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            using var subscription = registry.OnChanged(() =>
            {
                if (registry.GetAll().All(app => app.AppId != appId))
                    removed.TrySetResult();
            });
            registry.AppStopped(appId);
            await removed.Task.WaitAsync(timeout.Token);
            Assert.DoesNotContain(registry.GetAll(), app => app.AppId == appId);
        }
        finally
        {
            await registry.StopAsync(CancellationToken.None);
        }
    }

    [Fact]
    public async Task AppStopped_RefreshesPassiveDiscoveryWhileAnotherStartupIsPending()
    {
        const string existingAppId = "ttd/existing-app";
        var source = new FakePortListenerSource([]);
        var passiveDiscovery = new FakePassiveDiscovery([
            new AppDiscoveryCandidate("process", new Uri("http://127.0.0.1:5400/"), 42, "existing app process"),
        ]);
        var httpClientFactory = new FakeHttpClientFactory(existingAppId);
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Localtest:Url"] = "http://127.0.0.1:8000" })
            .Build();
        var registry = new AppRegistry(
            [passiveDiscovery],
            new StartupDiscovery(new PortListeners([source])),
            new AppMetadataProbe(httpClientFactory, NullLogger<AppMetadataProbe>.Instance),
            new LocaltestStorageProbe(configuration, httpClientFactory, NullLogger<LocaltestStorageProbe>.Instance),
            NullLogger<AppRegistry>.Instance
        );
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        using var pendingCancellation = new CancellationTokenSource();
        var discovered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var discoveredSubscription = registry.OnChanged(() =>
        {
            if (registry.GetAll().Any(app => app.AppId == existingAppId))
                discovered.TrySetResult();
        });

        await registry.StartAsync(timeout.Token);
        try
        {
            await discovered.Task.WaitAsync(timeout.Token);
            var pendingStart = registry.AppStarted(
                "ttd/pending-app",
                processId: 22808,
                containerId: null,
                hostPort: null,
                TimeSpan.FromSeconds(3),
                pendingCancellation.Token
            );
            await source.TargetedCall.Task.WaitAsync(timeout.Token);

            passiveDiscovery.Candidates = [];
            var removed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            using var removedSubscription = registry.OnChanged(() =>
            {
                if (registry.GetAll().All(app => app.AppId != existingAppId))
                    removed.TrySetResult();
            });
            registry.AppStopped(existingAppId);

            await removed.Task.WaitAsync(timeout.Token);
            Assert.DoesNotContain(registry.GetAll(), app => app.AppId == existingAppId);
            await pendingCancellation.CancelAsync();
            await Assert.ThrowsAnyAsync<OperationCanceledException>(async () => await pendingStart);
        }
        finally
        {
            await pendingCancellation.CancelAsync();
            await registry.StopAsync(CancellationToken.None);
        }
    }

    private sealed class FakePortListenerSource(
        IReadOnlyList<PortListener> listeners,
        int targetExceptions = 0,
        int emptyTargetResponses = 0
    ) : IPortListenerSource
    {
        public bool PassiveDiscoveryCalled { get; private set; }
        public IReadOnlySet<int>? RequestedProcessIds { get; private set; }
        public int TargetedCallCount { get; private set; }
        public TaskCompletionSource TargetedCall { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public bool SupportsCurrentPlatform() => true;

        public Task<IReadOnlyList<PortListener>> Get(CancellationToken cancellationToken)
        {
            PassiveDiscoveryCalled = true;
            return Task.FromResult(listeners);
        }

        public Task<IReadOnlyList<PortListener>> GetForProcesses(
            IReadOnlySet<int> processIds,
            CancellationToken cancellationToken
        )
        {
            RequestedProcessIds = processIds;
            TargetedCallCount++;
            TargetedCall.TrySetResult();
            if (TargetedCallCount <= targetExceptions)
                throw new InvalidOperationException("transient targeted discovery failure");
            if (TargetedCallCount <= targetExceptions + emptyTargetResponses)
                return Task.FromResult<IReadOnlyList<PortListener>>([]);

            return Task.FromResult<IReadOnlyList<PortListener>>([
                .. listeners.Where(listener => processIds.Contains(listener.ProcessId)),
            ]);
        }
    }

    private sealed class FakePassiveDiscovery(IReadOnlyList<AppDiscoveryCandidate>? candidates = null) : IAppDiscovery
    {
        public TimeSpan PassivePollInterval => TimeSpan.FromSeconds(5);
        public int CallCount { get; private set; }
        public IReadOnlyList<AppDiscoveryCandidate> Candidates { get; set; } = candidates ?? [];

        public Task<IReadOnlyList<AppDiscoveryCandidate>> Discover(CancellationToken cancellationToken)
        {
            CallCount++;
            return Task.FromResult(Candidates);
        }
    }

    private sealed class FakeHttpClientFactory(string appId) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(new MetadataHandler(appId));
    }

    private sealed class MetadataHandler(string appId) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        ) =>
            Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent($"{{\"id\":\"{appId}\"}}", Encoding.UTF8, "application/json"),
                }
            );
    }
}
