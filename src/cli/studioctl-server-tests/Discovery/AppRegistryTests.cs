using System.Net;
using System.Text;
using Altinn.Studio.StudioctlServer.Discovery;
using Altinn.Studio.StudioctlServer.Studioctl;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Studioctl.Tests.Discovery;

// The registry polls on a real timer, every 500 ms while a start is pending, and reads the time it compares against
// from a clock the tests move. Each test waits for the polls it needs before moving the clock.
public sealed class AppRegistryTests
{
    private const string AppId = "ttd/app";
    private const int AppPort = 5005;
    private const string LocaltestUrl = "http://127.0.0.1:8000";
    private static readonly TimeSpan _startupTimeout = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan _testTimeout = TimeSpan.FromSeconds(20);

    [Fact]
    public async Task RegisterApp_WhenLocaltestStaysUnreachable_ReportsLocaltestUnavailable()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var fixture = await RegistryFixture.Start(LocaltestAnswer.Unreachable, ct);

        var registration = new RegisterApp(fixture.Registry).Handle(
            new RegisterAppCommand(AppId, ProcessId: null, _startupTimeout, ContainerId: null, AppPort),
            ct
        );
        await fixture.Storage.WaitForProbes(2, ct);
        Assert.False(registration.IsCompleted);
        fixture.Time.Advance(AppRegistry.LocaltestUnavailableGrace);

        var result = await registration.WaitAsync(_testTimeout, ct);
        Assert.Equal(RegisterAppResultKind.LocaltestUnavailable, result.Kind);
        Assert.Contains(LocaltestUrl, result.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AppStarted_WhenLocaltestStartsWithinTheGrace_ReturnsTheApp()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var fixture = await RegistryFixture.Start(LocaltestAnswer.Unreachable, ct);

        var start = fixture.Registry.AppStarted(AppId, null, null, AppPort, _startupTimeout, ct);
        await fixture.Storage.WaitForProbes(2, ct);
        fixture.Time.Advance(AppRegistry.LocaltestUnavailableGrace - TimeSpan.FromSeconds(1));
        await fixture.Storage.WaitForProbes(fixture.Storage.Probes + 2, ct);
        Assert.False(start.IsCompleted);
        fixture.Storage.Answer = LocaltestAnswer.Ready;

        var baseUri = await start.WaitAsync(_testTimeout, ct);
        Assert.Equal(new Uri($"http://127.0.0.1:{AppPort}/"), baseUri);
    }

    [Fact]
    public async Task AppStarted_WhenTheTimeoutEndsBeforeTheGrace_ReportsLocaltestUnavailable()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var fixture = await RegistryFixture.Start(LocaltestAnswer.Unreachable, ct);

        var start = fixture.Registry.AppStarted(AppId, null, null, AppPort, TimeSpan.FromSeconds(2), ct);
        await fixture.Storage.WaitForProbes(2, ct);
        fixture.Time.Advance(TimeSpan.FromSeconds(3));

        await Assert.ThrowsAsync<LocaltestUnavailableException>(() => start.WaitAsync(_testTimeout, ct));
    }

    [Fact]
    public async Task AppStarted_WhenLocaltestAnswersWithoutTheApp_TimesOut()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var fixture = await RegistryFixture.Start(LocaltestAnswer.NotFound, ct);

        var start = fixture.Registry.AppStarted(AppId, null, null, AppPort, _startupTimeout, ct);
        await fixture.Storage.WaitForProbes(2, ct);
        fixture.Time.Advance(_startupTimeout);

        await Assert.ThrowsAsync<TimeoutException>(() => start.WaitAsync(_testTimeout, ct));
    }

    private enum LocaltestAnswer
    {
        Unreachable,
        NotFound,
        Ready,
    }

    private sealed class RegistryFixture : IAsyncDisposable
    {
        private RegistryFixture(AppRegistry registry, StorageHandler storage, ManualTimeProvider time)
        {
            Registry = registry;
            Storage = storage;
            Time = time;
        }

        public AppRegistry Registry { get; }
        public StorageHandler Storage { get; }
        public ManualTimeProvider Time { get; }

        public static async Task<RegistryFixture> Start(LocaltestAnswer answer, CancellationToken cancellationToken)
        {
            var storage = new StorageHandler { Answer = answer };
            var clients = new HttpClientFactory(new AppHandler(), storage);
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { ["Localtest:Url"] = LocaltestUrl })
                .Build();
            var time = new ManualTimeProvider();
            var registry = new AppRegistry(
                [new FakeDiscovery()],
                new AppMetadataProbe(clients, NullLogger<AppMetadataProbe>.Instance),
                new LocaltestStorageProbe(configuration, clients, NullLogger<LocaltestStorageProbe>.Instance),
                time,
                NullLogger<AppRegistry>.Instance
            );
            await registry.StartAsync(cancellationToken);
            return new RegistryFixture(registry, storage, time);
        }

        public async ValueTask DisposeAsync()
        {
            await Registry.StopAsync(CancellationToken.None);
            Registry.Dispose();
            Storage.Dispose();
        }
    }

    private sealed class FakeDiscovery : IAppDiscovery
    {
        public TimeSpan PassivePollInterval => TimeSpan.FromMinutes(1);

        public Task<IReadOnlyList<AppDiscoveryCandidate>> Discover(CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<AppDiscoveryCandidate>>([
                new AppDiscoveryCandidate(
                    "test",
                    new Uri($"http://127.0.0.1:{AppPort}/"),
                    ProcessId: null,
                    "test app",
                    HostPort: AppPort
                ),
            ]);
    }

    private sealed class HttpClientFactory(HttpMessageHandler app, HttpMessageHandler storage) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) =>
            new(name == LocaltestStorageProbe.HttpClientName ? storage : app, disposeHandler: false);
    }

    private sealed class AppHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        ) => Task.FromResult(AppMetadata());
    }

    // Answers Localtest's storage API the way the test sets it, and counts the probes.
    private sealed class StorageHandler : HttpMessageHandler
    {
        private int _probes;

        public LocaltestAnswer Answer { get; set; }

        public int Probes => Volatile.Read(ref _probes);

        public async Task WaitForProbes(int count, CancellationToken cancellationToken)
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(_testTimeout);
            while (Probes < count)
                await Task.Delay(TimeSpan.FromMilliseconds(20), timeout.Token);
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Interlocked.Increment(ref _probes);
            return Answer switch
            {
                LocaltestAnswer.Unreachable => throw new HttpRequestException("Connection refused"),
                LocaltestAnswer.NotFound => Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound)),
                _ => Task.FromResult(AppMetadata()),
            };
        }
    }

    private static HttpResponseMessage AppMetadata() =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent($$"""{"id":"{{AppId}}"}""", Encoding.UTF8, "application/json"),
        };

    private sealed class ManualTimeProvider : TimeProvider
    {
        private long _utcTicks = new DateTimeOffset(2026, 11, 11, 12, 0, 0, TimeSpan.Zero).UtcTicks;

        public override DateTimeOffset GetUtcNow() => new(Interlocked.Read(ref _utcTicks), TimeSpan.Zero);

        public void Advance(TimeSpan by) => Interlocked.Add(ref _utcTicks, by.Ticks);
    }
}
