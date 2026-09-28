using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Text;
using Altinn.Studio.Gateway.Api.Clients.Designer;
using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Endpoints.Internal;
using Altinn.Studio.Gateway.Api.Hosting;
using Altinn.Studio.Gateway.Api.Telemetry;
using k8s;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using OpenTelemetry.Trace;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class CallerAbortedTelemetryTests
{
    private const string UpstreamClientName = "upstream";
    private static readonly TimeSpan _timeout = TimeSpan.FromSeconds(10);

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CallerAbortedRequest_MarksRequestAndCancelledOutboundCall(bool useDesignerResilience)
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var upstream = new HangingUpstream();
        var exportedSpans = new List<Activity>();

        await using var app = BuildApp(
            exportedSpans,
            upstream.Uri,
            configureUpstreamClient: client =>
            {
                if (useDesignerResilience)
                    client.AddStandardResilienceHandler(DesignerClientRegistration.ConfigureResilience);
            }
        );
        await app.StartAsync(cancellationToken);

        await PostAndHangUp(app, "alerts", content: null, upstream.Connected, cancellationToken);
        // Stopping drains in-flight requests, so every span has been exported afterwards.
        await app.StopAsync(cancellationToken);

        var server = Assert.Single(exportedSpans, span => span.Kind == ActivityKind.Server);
        var client = Assert.Single(exportedSpans, IsOutboundCall);

        Assert.Equal(499, server.GetTagItem("http.response.status_code"));
        Assert.True(IsMarked(server));
        Assert.Equal(ActivityStatusCode.Unset, client.Status);
        Assert.Null(client.GetTagItem("error.type"));
        Assert.True(IsMarked(client));
    }

    [Fact]
    public async Task RequestFailingAfterCallerAborted_IsNotMarked()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var upstream = new HangingUpstream();
        var exportedSpans = new List<Activity>();
        await using var app = BuildApp(exportedSpans, upstream.Uri);
        await app.StartAsync(cancellationToken);
        var requestReceived = app.Services.GetRequiredService<RequestReceived>();

        await PostAndHangUp(app, "fails-after-caller-aborts", content: null, requestReceived.Task, cancellationToken);
        await app.StopAsync(cancellationToken);

        var server = Assert.Single(exportedSpans, span => span.Kind == ActivityKind.Server);

        Assert.Equal(499, server.GetTagItem("http.response.status_code"));
        Assert.Equal(ActivityStatusCode.Error, server.Status);
        Assert.False(IsMarked(server));
    }

    [Fact]
    public async Task FailedOutboundCall_IsNotMarked()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var exportedSpans = new List<Activity>();
        // Nothing listens on this port, so the outbound call fails while the caller is still waiting.
        await using var app = BuildApp(exportedSpans, new Uri($"http://127.0.0.1:{GetUnusedPort()}/"));
        await app.StartAsync(cancellationToken);

        using var response = await Post(app, "alerts", cancellationToken);
        await app.StopAsync(cancellationToken);

        var server = Assert.Single(exportedSpans, span => span.Kind == ActivityKind.Server);
        var client = Assert.Single(exportedSpans, IsOutboundCall);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.False(IsMarked(server));
        Assert.Equal(ActivityStatusCode.Error, client.Status);
        Assert.False(IsMarked(client));
    }

    [Fact]
    public async Task TimedOutOutboundCall_IsNotMarked()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var upstream = new HangingUpstream();
        var exportedSpans = new List<Activity>();
        await using var app = BuildApp(
            exportedSpans,
            upstream.Uri,
            configureUpstreamClient: client =>
                client.ConfigureHttpClient(httpClient => httpClient.Timeout = TimeSpan.FromMilliseconds(500))
        );
        await app.StartAsync(cancellationToken);

        using var response = await Post(app, "alerts", cancellationToken);
        await app.StopAsync(cancellationToken);

        var client = Assert.Single(exportedSpans, IsOutboundCall);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(ActivityStatusCode.Error, client.Status);
        Assert.Equal("System.Threading.Tasks.TaskCanceledException", client.GetTagItem("error.type"));
        Assert.False(IsMarked(client));
    }

    [Fact]
    public async Task RetriedAttemptTimeouts_AreNotMarked()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var upstream = new HangingUpstream();
        var exportedSpans = new List<Activity>();
        await using var app = BuildApp(
            exportedSpans,
            upstream.Uri,
            configureUpstreamClient: client =>
                client.AddStandardResilienceHandler(options =>
                {
                    DesignerClientRegistration.ConfigureResilience(options);
                    options.AttemptTimeout.Timeout = TimeSpan.FromMilliseconds(300);
                    options.Retry.MaxRetryAttempts = 1;
                    options.Retry.Delay = TimeSpan.Zero;
                })
        );
        await app.StartAsync(cancellationToken);

        using var response = await Post(app, "alerts", cancellationToken);
        await app.StopAsync(cancellationToken);

        var attempts = exportedSpans.Where(IsOutboundCall).ToList();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(2, attempts.Count);
        Assert.All(attempts, attempt => Assert.Equal(ActivityStatusCode.Error, attempt.Status));
        Assert.All(attempts, attempt => Assert.False(IsMarked(attempt)));
    }

    [Fact]
    public async Task FluxWebhook_CallerAborted_IsNotReportedAsFailure()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var upstream = new HangingUpstream();
        var exportedSpans = new List<Activity>();
        await using var app = BuildApp(exportedSpans, upstream.Uri);
        await app.StartAsync(cancellationToken);

        using var fluxEvent = JsonContent.Create(
            new
            {
                involvedObject = new
                {
                    kind = "HelmRelease",
                    name = FakeKubernetesHandler.HelmReleaseName,
                    @namespace = "default",
                },
                severity = "info",
                timestamp = DateTimeOffset.UtcNow,
                message = "Helm upgrade succeeded",
                reason = "UpgradeSucceeded",
                reportingController = "helm-controller",
            }
        );
        await PostAndHangUp(
            app,
            "runtime/gateway/api/v1/flux/webhook",
            fluxEvent,
            upstream.Connected,
            cancellationToken
        );
        await app.StopAsync(cancellationToken);

        var processEvent = Assert.Single(exportedSpans, span => span.OperationName == "FluxWebhook.ProcessEvent");
        var client = Assert.Single(exportedSpans, IsOutboundCall);
        var logs = app.Services.GetFakeLogCollector().GetSnapshot();

        Assert.NotEqual(ActivityStatusCode.Error, processEvent.Status);
        Assert.Empty(processEvent.Events);
        Assert.True(IsMarked(client));
        Assert.DoesNotContain(logs, record => record.Level >= LogLevel.Warning);
    }

    private static WebApplication BuildApp(
        List<Activity> exportedSpans,
        Uri upstreamUri,
        Action<IHttpClientBuilder>? configureUpstreamClient = null
    )
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.AddOpenTelemetry();
        builder.Services.ConfigureOpenTelemetryTracerProvider(tracing => tracing.AddInMemoryExporter(exportedSpans));
        builder.Services.AddFakeLogging();
        builder.Services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.PropertyNameCaseInsensitive = true;
            options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
        });
        builder.Services.AddSingleton<RequestReceived>();
        builder.Services.AddSingleton<IKubernetes>(_ => new Kubernetes(
            new KubernetesClientConfiguration { Host = "http://kubernetes.example" },
            new FakeKubernetesHandler()
        ));
        builder.Services.AddSingleton<HelmReleaseClient>();
        var upstreamClient = builder.Services.AddHttpClient(
            UpstreamClientName,
            client => client.BaseAddress = upstreamUri
        );
        configureUpstreamClient?.Invoke(upstreamClient);
        // The Flux endpoint resolves the Designer client by the HelmRelease's source environment label.
        builder.Services.AddHttpClient(
            FakeKubernetesHandler.SourceEnvironment,
            client => client.BaseAddress = upstreamUri
        );

        var app = builder.Build();
        app.MapPost(
            "/alerts",
            async (IHttpClientFactory httpClientFactory, CancellationToken cancellationToken) =>
            {
                using var client = httpClientFactory.CreateClient(UpstreamClientName);
                using var response = await client.PostAsync(
                    new Uri("designer", UriKind.Relative),
                    content: null,
                    cancellationToken
                );
                return Results.Ok();
            }
        );
        app.MapPost(
            "/fails-after-caller-aborts",
            async (RequestReceived requestReceived, CancellationToken cancellationToken) =>
            {
                requestReceived.SetResult();
                await Task.Delay(Timeout.Infinite, cancellationToken)
                    .ContinueWith(
                        _ => { },
                        CancellationToken.None,
                        TaskContinuationOptions.None,
                        TaskScheduler.Default
                    );
                throw new InvalidOperationException("Failed after the caller aborted");
            }
        );
        app.MapGroup("/runtime/gateway/api/v1").MapFluxWebhookEndpoint();
        return app;
    }

    private static async Task<HttpResponseMessage> Post(
        WebApplication app,
        string path,
        CancellationToken cancellationToken
    )
    {
        using var caller = new HttpClient { BaseAddress = GetAddress(app) };
        return await caller.PostAsync(new Uri(path, UriKind.Relative), content: null, cancellationToken);
    }

    /// <summary>
    /// Posts to the app and hangs up once <paramref name="hangUpWhen"/> completes, like Grafana closing a webhook request.
    /// </summary>
    private static async Task PostAndHangUp(
        WebApplication app,
        string path,
        HttpContent? content,
        Task hangUpWhen,
        CancellationToken cancellationToken
    )
    {
        using var caller = new HttpClient { BaseAddress = GetAddress(app) };
        using var callerCancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
        {
            var request = caller.PostAsync(new Uri(path, UriKind.Relative), content, callerCancellation.Token);
            await hangUpWhen.WaitAsync(_timeout, cancellationToken);
            await callerCancellation.CancelAsync();
            await request;
        });
    }

    private static Uri GetAddress(WebApplication app) =>
        new(
            app.Services.GetRequiredService<IServer>()
                .Features.GetRequiredFeature<IServerAddressesFeature>()
                .Addresses.Single()
        );

    private static int GetUnusedPort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        return ((IPEndPoint)listener.LocalEndpoint).Port;
    }

    private static bool IsMarked(Activity span) =>
        span.GetTagItem(CallerAbortedSpanProcessor.CallerAbortedAttribute) is true;

    private static bool IsOutboundCall(Activity span) =>
        span.Kind == ActivityKind.Client
        && span.GetTagItem("url.full") is string url
        && url.StartsWith("http://127.0.0.1:", StringComparison.Ordinal)
        && url.Contains("/designer", StringComparison.Ordinal);

    private sealed class RequestReceived
    {
        private readonly TaskCompletionSource _received = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task Task => _received.Task;

        public void SetResult() => _received.TrySetResult();
    }

    /// <summary>
    /// Serves a single HelmRelease with the labels and trace context annotation the Flux endpoint needs.
    /// </summary>
    private sealed class FakeKubernetesHandler : DelegatingHandler
    {
        public const string HelmReleaseName = "ttd-app-tt02";
        public const string SourceEnvironment = "studio";

        private const string HelmRelease = $$"""
            {
              "apiVersion": "helm.toolkit.fluxcd.io/v2",
              "kind": "HelmRelease",
              "metadata": {
                "name": "{{HelmReleaseName}}",
                "namespace": "default",
                "labels": {
                  "{{StudioLabels.BuildId}}": "1",
                  "{{StudioLabels.SourceEnvironment}}": "{{SourceEnvironment}}",
                  "{{StudioLabels.Org}}": "ttd",
                  "{{StudioLabels.App}}": "app"
                },
                "annotations": {
                  "{{StudioLabels.TraceParent}}": "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
                }
              }
            }
            """;

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        ) =>
            Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(HelmRelease, Encoding.UTF8, "application/json"),
                    RequestMessage = request,
                }
            );
    }

    /// <summary>
    /// Accepts connections but never responds, like a Designer call that is still in progress.
    /// </summary>
    private sealed class HangingUpstream : IAsyncDisposable
    {
        private readonly TcpListener _listener = new(IPAddress.Loopback, 0);
        private readonly TaskCompletionSource _connected = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly Task _acceptLoop;

        public HangingUpstream()
        {
            _listener.Start();
            Uri = new Uri($"http://127.0.0.1:{((IPEndPoint)_listener.LocalEndpoint).Port}/");
            _acceptLoop = AcceptAndHoldAsync();
        }

        public Uri Uri { get; }

        /// <summary>
        /// Completes when the gateway has opened its first connection.
        /// </summary>
        public Task Connected => _connected.Task;

        public async ValueTask DisposeAsync()
        {
            _listener.Stop();
            await _acceptLoop;
            _listener.Dispose();
        }

        private async Task AcceptAndHoldAsync()
        {
            var connections = new List<Task>();
            try
            {
                while (true)
                {
                    var connection = await _listener.AcceptTcpClientAsync();
                    _connected.TrySetResult();
                    connections.Add(HoldAsync(connection));
                }
            }
            catch (SocketException)
            {
                // The listener was stopped.
            }
            catch (ObjectDisposedException)
            {
                // The listener was stopped.
            }
            await Task.WhenAll(connections);
        }

        private static async Task HoldAsync(TcpClient connection)
        {
            using (connection)
            {
                try
                {
                    // Hold the connection open without responding until the gateway gives up on it.
                    await connection.GetStream().CopyToAsync(Stream.Null);
                }
                catch (IOException)
                {
                    // The gateway reset the connection.
                }
            }
        }
    }
}
