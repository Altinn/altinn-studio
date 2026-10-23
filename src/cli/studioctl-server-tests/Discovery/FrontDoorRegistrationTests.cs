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

        await registration.Reconcile([app], TestContext.Current.CancellationToken);
        await registration.Reconcile([app], TestContext.Current.CancellationToken);
        await registration.Reconcile([App("ttd/frontend-test", 5006)], TestContext.Current.CancellationToken);
        await registration.Reconcile([], TestContext.Current.CancellationToken);

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
    public async Task RetriesAFailedRegistrationOnTheNextRefresh()
    {
        var frontDoor = new FakeFrontDoor { PutStatus = HttpStatusCode.BadGateway };
        var registration = Registration(frontDoor, enabled: true);
        var app = App("ttd/frontend-test", 5005);

        await registration.Reconcile([app], TestContext.Current.CancellationToken);
        frontDoor.PutStatus = HttpStatusCode.OK;
        await registration.Reconcile([app], TestContext.Current.CancellationToken);
        await registration.Reconcile([app], TestContext.Current.CancellationToken);

        Assert.Equal(2, frontDoor.Calls.Count(call => call.StartsWith("PUT ", StringComparison.Ordinal)));
    }

    [Fact]
    public async Task RegistersAnAppAgainWhenTheFrontDoorNoLongerListsIt()
    {
        var frontDoor = new FakeFrontDoor();
        var registration = Registration(frontDoor, enabled: true);
        var app = App("ttd/frontend-test", 5005);

        await registration.Reconcile([app], TestContext.Current.CancellationToken);
        frontDoor.Apps.Clear(); // The localtest container was recreated without its data.
        await registration.Reconcile([app], TestContext.Current.CancellationToken);

        Assert.Equal(2, frontDoor.Calls.Count(call => call.StartsWith("PUT ", StringComparison.Ordinal)));
        Assert.Equal(["ttd/frontend-test http://host.docker.internal:5005"], frontDoor.Apps);
    }

    [Fact]
    public async Task RegistersAnAppAgainUntilDialogportensSyncSucceeds()
    {
        var frontDoor = new FakeFrontDoor { Dialogporten = "Failed" };
        var registration = Registration(frontDoor, enabled: true);
        var app = App("ttd/frontend-test", 5005);

        await registration.Reconcile([app], TestContext.Current.CancellationToken);
        await registration.Reconcile([app], TestContext.Current.CancellationToken);
        frontDoor.Dialogporten = "Synced";
        await registration.Reconcile([app], TestContext.Current.CancellationToken);
        await registration.Reconcile([app], TestContext.Current.CancellationToken);
        await registration.Reconcile([], TestContext.Current.CancellationToken);

        Assert.Equal(3, frontDoor.Calls.Count(call => call.StartsWith("PUT ", StringComparison.Ordinal)));
        Assert.Single(frontDoor.Calls, call => call.StartsWith("DELETE ", StringComparison.Ordinal));
    }

    [Fact]
    public async Task RegistersARestartedAppAgain()
    {
        var frontDoor = new FakeFrontDoor();
        var registration = Registration(frontDoor, enabled: true);

        await registration.Reconcile(
            [App("ttd/frontend-test", 5005, processId: 100)],
            TestContext.Current.CancellationToken
        );
        await registration.Reconcile(
            [App("ttd/frontend-test", 5005, processId: 200)],
            TestContext.Current.CancellationToken
        );

        Assert.Equal(2, frontDoor.Calls.Count(call => call.StartsWith("PUT ", StringComparison.Ordinal)));
    }

    [Fact]
    public async Task KeepsARegistrationWhenTheFrontDoorCannotListItsApps()
    {
        var frontDoor = new FakeFrontDoor();
        var registration = Registration(frontDoor, enabled: true);
        var app = App("ttd/frontend-test", 5005);

        await registration.Reconcile([app], TestContext.Current.CancellationToken);
        frontDoor.GetStatus = HttpStatusCode.ServiceUnavailable;
        frontDoor.Apps.Clear();
        await registration.Reconcile([app], TestContext.Current.CancellationToken);

        Assert.Equal(1, frontDoor.Calls.Count(call => call.StartsWith("PUT ", StringComparison.Ordinal)));
    }

    [Fact]
    public async Task DoesNothingWithoutLocaltestV2()
    {
        var frontDoor = new FakeFrontDoor();

        await Registration(frontDoor, enabled: false)
            .Reconcile([App("ttd/frontend-test", 5005)], TestContext.Current.CancellationToken);

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

    /// <summary>The front door's app API: PUT registers, DELETE removes, GET lists; every call is recorded.</summary>
    private sealed class FakeFrontDoor : HttpMessageHandler
    {
        public List<string> Calls { get; } = [];

        /// <summary>The registered apps, as "org/app url".</summary>
        public List<string> Apps { get; } = [];

        public HttpStatusCode PutStatus { get; set; } = HttpStatusCode.OK;

        public HttpStatusCode GetStatus { get; set; } = HttpStatusCode.OK;

        /// <summary>The Dialogporten sync result a successful registration answers.</summary>
        public string Dialogporten { get; set; } = "Synced";

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
            Calls.Add($"{request.Method} {request.RequestUri} {body}");
            var appId = (request.RequestUri?.AbsolutePath ?? "")["/localtest/api/apps".Length..].TrimStart('/');
            if (request.Method == HttpMethod.Get)
            {
                var listed = Apps.Select(entry => entry.Split(' '))
                    .Select(parts => new
                    {
                        org = parts[0].Split('/')[0],
                        app = parts[0].Split('/')[1],
                        url = parts[1],
                    });
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

    private sealed class ClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }
}
