using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Altinn.Studio.StudioctlServer.Discovery;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Studioctl.Tests.Discovery;

public sealed class FrontDoorRegistrationTests
{
    [Fact]
    public async Task RegistersANewAppOnceAtItsHostGatewayAddressAndRemovesItWhenGone()
    {
        var frontDoor = new FakeFrontDoor();
        var registration = Registration(frontDoor, enabled: true);
        var app = App("ttd/frontend-test", 5005);

        await Reconcile(registration, [app]);
        await Reconcile(registration, [app]);
        await Reconcile(registration, [App("ttd/frontend-test", 5006)]);
        await Reconcile(registration, []);

        Assert.Equal(
            [
                "PUT http://local.altinn.cloud:8000/localtest/api/apps/ttd/frontend-test {\"url\":\"http://host.docker.internal:5005\"}",
                "GET http://local.altinn.cloud:8000/localtest/api/apps ",
                "PUT http://local.altinn.cloud:8000/localtest/api/apps/ttd/frontend-test {\"url\":\"http://host.docker.internal:5006\"}",
                "DELETE http://local.altinn.cloud:8000/localtest/api/apps/ttd/frontend-test ",
            ],
            frontDoor.Calls
        );
        Assert.Empty(frontDoor.Apps);
    }

    [Fact]
    public async Task RegistersAContainerOnTheLocaltestV2NetworkAtItsAlias()
    {
        var frontDoor = new FakeFrontDoor();
        var registration = Registration(frontDoor, enabled: true);
        var app = App("ttd/frontend-test", 5005) with
        {
            Source = "container",
            ContainerId = "abc",
            FrontDoorUri = new Uri("http://ttd-frontend-test:5005"),
        };

        await Reconcile(registration, [app]);
        await Reconcile(registration, [app]);

        Assert.Equal(
            [
                "PUT http://local.altinn.cloud:8000/localtest/api/apps/ttd/frontend-test {\"url\":\"http://ttd-frontend-test:5005\"}",
                "GET http://local.altinn.cloud:8000/localtest/api/apps ",
            ],
            frontDoor.Calls
        );
        Assert.Equal(["ttd/frontend-test http://ttd-frontend-test:5005"], frontDoor.Apps);
    }

    [Fact]
    public async Task RetriesAFailedRegistrationOnTheNextRefresh()
    {
        var frontDoor = new FakeFrontDoor { PutStatus = HttpStatusCode.BadGateway };
        var registration = Registration(frontDoor, enabled: true);
        var app = App("ttd/frontend-test", 5005);

        await Reconcile(registration, [app]);
        frontDoor.PutStatus = HttpStatusCode.OK;
        await Reconcile(registration, [app]);
        await Reconcile(registration, [app]);

        Assert.Equal(2, frontDoor.Calls.Count(call => call.StartsWith("PUT ", StringComparison.Ordinal)));
    }

    [Fact]
    public async Task RegistersAnAppAgainWhenTheFrontDoorNoLongerListsIt()
    {
        var frontDoor = new FakeFrontDoor();
        var registration = Registration(frontDoor, enabled: true);
        var app = App("ttd/frontend-test", 5005);

        await Reconcile(registration, [app]);
        frontDoor.Apps.Clear(); // The localtest container was recreated without its data.
        await Reconcile(registration, [app]);

        Assert.Equal(2, frontDoor.Calls.Count(call => call.StartsWith("PUT ", StringComparison.Ordinal)));
        Assert.Equal(["ttd/frontend-test http://host.docker.internal:5005"], frontDoor.Apps);
    }

    [Fact]
    public async Task RegistersAnAppAgainUntilDialogportensSyncSucceeds()
    {
        var frontDoor = new FakeFrontDoor { Dialogporten = "Failed" };
        var registration = Registration(frontDoor, enabled: true);
        var app = App("ttd/frontend-test", 5005);

        await Reconcile(registration, [app]);
        await Reconcile(registration, [app]);
        frontDoor.Dialogporten = "Synced";
        await Reconcile(registration, [app]);
        await Reconcile(registration, [app]);
        await Reconcile(registration, []);

        Assert.Equal(3, frontDoor.Calls.Count(call => call.StartsWith("PUT ", StringComparison.Ordinal)));
        Assert.Single(frontDoor.Calls, call => call.StartsWith("DELETE ", StringComparison.Ordinal));
    }

    [Fact]
    public async Task RegistersARestartedAppAgain()
    {
        var frontDoor = new FakeFrontDoor();
        var registration = Registration(frontDoor, enabled: true);

        await Reconcile(registration, [App("ttd/frontend-test", 5005, processId: 100)]);
        await Reconcile(registration, [App("ttd/frontend-test", 5005, processId: 200)]);

        Assert.Equal(2, frontDoor.Calls.Count(call => call.StartsWith("PUT ", StringComparison.Ordinal)));
    }

    [Fact]
    public async Task KeepsARegistrationWhenTheFrontDoorCannotListItsApps()
    {
        var frontDoor = new FakeFrontDoor();
        var registration = Registration(frontDoor, enabled: true);
        var app = App("ttd/frontend-test", 5005);

        await Reconcile(registration, [app]);
        frontDoor.GetStatus = HttpStatusCode.ServiceUnavailable;
        frontDoor.Apps.Clear();
        await Reconcile(registration, [app]);

        Assert.Equal(1, frontDoor.Calls.Count(call => call.StartsWith("PUT ", StringComparison.Ordinal)));
    }

    [Fact]
    public async Task DoesNothingWithoutLocaltestV2()
    {
        var frontDoor = new FakeFrontDoor();

        await Reconcile(Registration(frontDoor, enabled: false), [App("ttd/frontend-test", 5005)]);

        Assert.Empty(frontDoor.Calls);
    }

    [Fact]
    public void IsOnOnlyWithTheSettingAndThePublicOrigin()
    {
        static FrontDoorRegistrationOptions Options(string? registerApps, string? url) =>
            FrontDoorRegistrationOptions.FromConfiguration(
                new ConfigurationBuilder()
                    .AddInMemoryCollection(
                        new Dictionary<string, string?>
                        {
                            ["Localtest:RegisterApps"] = registerApps,
                            ["Localtest:Url"] = url,
                        }
                    )
                    .Build()
            );

        Assert.True(Options("true", "http://local.altinn.cloud:8000/").Enabled);
        Assert.False(Options(null, "http://local.altinn.cloud:8000/").Enabled);
        Assert.False(Options("true", null).Enabled);
    }

    [Fact]
    public async Task AHangingFrontDoorDelaysNeitherDiscoveryNorTheStartOfAnotherApp()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var frontDoor = new FakeFrontDoor();
        var hanging = frontDoor.Hold("ttd/hanging");
        var discovery = new FakeDiscovery(frontDoor);
        discovery.Add("ttd/hanging", 5005);
        using var registry = Registry(frontDoor, discovery, enabled: true);
        await registry.StartAsync(cancellationToken);
        try
        {
            await hanging.Started.Task.WaitAsync(_waitTimeout, cancellationToken);

            discovery.Add("ttd/other", 5006);
            var started = await registry
                .AppStarted("ttd/other", null, null, 5006, _waitTimeout, cancellationToken)
                .WaitAsync(_waitTimeout, cancellationToken);

            Assert.Equal(new Uri("http://127.0.0.1:5006/"), started);
            Assert.Equal(["ttd/hanging", "ttd/other"], registry.GetAll().Select(app => app.AppId).Order());
            Assert.Equal(["ttd/other http://host.docker.internal:5006"], frontDoor.Apps);
        }
        finally
        {
            await registry.StopAsync(CancellationToken.None);
        }
    }

    [Fact]
    public async Task AStartCompletesOnlyAfterItsRegistrationSucceeds()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var frontDoor = new FakeFrontDoor();
        var held = frontDoor.Hold("ttd/frontend-test");
        var discovery = new FakeDiscovery(frontDoor);
        discovery.Add("ttd/frontend-test", 5005);
        using var registry = Registry(frontDoor, discovery, enabled: true);
        await registry.StartAsync(cancellationToken);
        try
        {
            var start = registry.AppStarted("ttd/frontend-test", null, null, 5005, _waitTimeout, cancellationToken);
            await held.Started.Task.WaitAsync(_waitTimeout, cancellationToken);
            var refreshes = discovery.Calls;
            await Until(() => discovery.Calls >= refreshes + 3, cancellationToken);

            Assert.False(start.IsCompleted);
            Assert.DoesNotContain(frontDoor.Calls, call => call.Contains("/storage/", StringComparison.Ordinal));

            held.Release.SetResult();
            Assert.Equal(new Uri("http://127.0.0.1:5005/"), await start.WaitAsync(_waitTimeout, cancellationToken));
            Assert.Equal(["ttd/frontend-test http://host.docker.internal:5005"], frontDoor.Apps);
        }
        finally
        {
            await registry.StopAsync(CancellationToken.None);
        }
    }

    [Fact]
    public async Task AStartCompletesWithoutTheFrontDoorWithoutLocaltestV2()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var frontDoor = new FakeFrontDoor();
        var discovery = new FakeDiscovery(frontDoor);
        discovery.Add("ttd/frontend-test", 5005);
        using var registry = Registry(frontDoor, discovery, enabled: false);
        await registry.StartAsync(cancellationToken);
        try
        {
            var started = await registry
                .AppStarted("ttd/frontend-test", null, null, 5005, _waitTimeout, cancellationToken)
                .WaitAsync(_waitTimeout, cancellationToken);

            Assert.Equal(new Uri("http://127.0.0.1:5005/"), started);
            Assert.DoesNotContain(
                frontDoor.Calls,
                call => call.Contains("/localtest/api/apps", StringComparison.Ordinal)
            );
        }
        finally
        {
            await registry.StopAsync(CancellationToken.None);
        }
    }

    private static readonly TimeSpan _waitTimeout = TimeSpan.FromSeconds(10);

    /// <summary>Hands the apps to the registration and waits for the calls to the front door it starts.</summary>
    private static async Task Reconcile(FrontDoorRegistration registration, IReadOnlyList<DiscoveredApp> apps)
    {
        registration.Reconcile(apps, TestContext.Current.CancellationToken);
        await registration.WhenIdle().WaitAsync(_waitTimeout, TestContext.Current.CancellationToken);
    }

    private static async Task Until(Func<bool> condition, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(_waitTimeout);
        while (!condition())
            await Task.Delay(50, timeout.Token);
    }

    private static AppRegistry Registry(FakeFrontDoor handler, FakeDiscovery discovery, bool enabled)
    {
        var factory = new ClientFactory(handler);
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?> { ["Localtest:Url"] = "http://local.altinn.cloud:8000/" }
            )
            .Build();
        return new AppRegistry(
            [discovery],
            new AppMetadataProbe(factory, NullLogger<AppMetadataProbe>.Instance),
            new LocaltestStorageProbe(configuration, factory, NullLogger<LocaltestStorageProbe>.Instance),
            Registration(handler, enabled),
            NullLogger<AppRegistry>.Instance
        );
    }

    private static FrontDoorRegistration Registration(FakeFrontDoor handler, bool enabled) =>
        new(
            new FrontDoorRegistrationOptions(new Uri("http://local.altinn.cloud:8000/"), enabled),
            new ClientFactory(handler),
            NullLogger<FrontDoorRegistration>.Instance
        );

    private static DiscoveredApp App(string appId, int port, int? processId = null) =>
        new(
            appId,
            AppEndpointUri.From(new Uri($"http://127.0.0.1:{port}/")),
            "process",
            ProcessId: processId,
            Description: "test",
            ContainerId: null,
            Name: null,
            HostPort: port
        );

    /// <summary>
    /// The front door's app API: PUT registers, DELETE removes, GET lists. Every call is recorded. Behind the same
    /// origin, Storage knows every app. On its port, each app answers its metadata probe.
    /// </summary>
    private sealed class FakeFrontDoor : HttpMessageHandler
    {
        private readonly Lock _lock = new();
        private readonly List<string> _calls = [];
        private readonly Dictionary<string, Held> _held = new(StringComparer.Ordinal);

        public IReadOnlyList<string> Calls
        {
            get
            {
                lock (_lock)
                    return [.. _calls];
            }
        }

        /// <summary>The registered apps, as "org/app url".</summary>
        public List<string> Apps { get; } = [];

        /// <summary>The app answering on each port.</summary>
        public Dictionary<int, string> AppsByPort { get; } = [];

        public HttpStatusCode PutStatus { get; set; } = HttpStatusCode.OK;

        public HttpStatusCode GetStatus { get; set; } = HttpStatusCode.OK;

        /// <summary>The Dialogporten sync result a successful registration answers.</summary>
        public string Dialogporten { get; set; } = "Synced";

        /// <summary>Holds the registrations of the app until released.</summary>
        public Held Hold(string appId)
        {
            var held = new Held();
            lock (_lock)
                _held[appId] = held;
            return held;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
            var path = request.RequestUri?.AbsolutePath ?? "";
            lock (_lock)
                _calls.Add($"{request.Method} {request.RequestUri} {body}");

            if (request.RequestUri?.Port is { } port && port != 8000)
            {
                lock (AppsByPort)
                    return Json(new { id = AppsByPort[port] });
            }
            if (path.StartsWith("/storage/api/v1/applications/", StringComparison.Ordinal))
                return Json(new { id = path["/storage/api/v1/applications/".Length..] });

            var appId = path["/localtest/api/apps".Length..].TrimStart('/');
            Held? held;
            lock (_lock)
                held = request.Method == HttpMethod.Put ? _held.GetValueOrDefault(appId) : null;
            if (held is not null)
            {
                held.Started.TrySetResult();
                await held.Release.Task.WaitAsync(cancellationToken);
            }

            lock (_lock)
            {
                if (request.Method == HttpMethod.Get)
                {
                    var listed = Apps.Select(entry => entry.Split(' '))
                        .Select(parts => new
                        {
                            org = parts[0].Split('/')[0],
                            app = parts[0].Split('/')[1],
                            url = parts[1],
                        })
                        .ToArray();
                    return new HttpResponseMessage(GetStatus) { Content = JsonContent.Create(listed) };
                }
                if (request.Method == HttpMethod.Put && PutStatus == HttpStatusCode.OK)
                {
                    var url = JsonDocument.Parse(body).RootElement.GetProperty("url").GetString();
                    Apps.RemoveAll(entry => entry.StartsWith(appId + " ", StringComparison.Ordinal));
                    Apps.Add($"{appId} {url}");
                }
                if (request.Method == HttpMethod.Delete)
                    Apps.RemoveAll(entry => entry.StartsWith(appId + " ", StringComparison.Ordinal));
                return new HttpResponseMessage(request.Method == HttpMethod.Put ? PutStatus : HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        $"{{\"provisioning\":{{\"state\":\"succeeded\",\"result\":{{\"dialogporten\":\"{Dialogporten}\"}}}}}}"
                    ),
                };
            }
        }

        private static HttpResponseMessage Json(object value) =>
            new(HttpStatusCode.OK) { Content = JsonContent.Create(value) };
    }

    /// <summary>A registration the front door holds: started once it arrived, answered once released.</summary>
    private sealed class Held
    {
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    }

    /// <summary>Finds the apps added to it on the host, at their ports. Counts its passes.</summary>
    private sealed class FakeDiscovery(FakeFrontDoor frontDoor) : IAppDiscovery
    {
        private int _calls;

        public int Calls => Volatile.Read(ref _calls);

        public TimeSpan PassivePollInterval => TimeSpan.FromMilliseconds(100);

        public void Add(string appId, int port)
        {
            lock (frontDoor.AppsByPort)
                frontDoor.AppsByPort[port] = appId;
        }

        public Task<IReadOnlyList<AppDiscoveryCandidate>> Discover(CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref _calls);
            int[] ports;
            lock (frontDoor.AppsByPort)
                ports = [.. frontDoor.AppsByPort.Keys];
            return Task.FromResult<IReadOnlyList<AppDiscoveryCandidate>>([
                .. ports.Select(port => new AppDiscoveryCandidate(
                    "process",
                    new Uri($"http://127.0.0.1:{port}/"),
                    ProcessId: null,
                    Description: "test",
                    HostPort: port
                )),
            ]);
        }
    }

    private sealed class ClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }
}
