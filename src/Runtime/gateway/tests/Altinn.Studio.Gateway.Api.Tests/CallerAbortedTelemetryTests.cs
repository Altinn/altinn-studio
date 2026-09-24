using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using Altinn.Studio.Gateway.Api.Hosting;
using Altinn.Studio.Gateway.Api.Telemetry;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Trace;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class CallerAbortedTelemetryTests
{
    private static readonly TimeSpan _timeout = TimeSpan.FromSeconds(10);

    [Fact]
    public async Task CallerAbortedRequest_MarksRequestAndCancelledOutboundCall()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var upstream = new HangingUpstream();
        var exportedSpans = new List<Activity>();

        await using var app = BuildApp(exportedSpans, upstream.Uri);
        await app.StartAsync(cancellationToken);

        using var caller = new HttpClient { BaseAddress = GetAddress(app) };
        using var callerCancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
        {
            var request = caller.PostAsync(
                new Uri("alerts", UriKind.Relative),
                content: null,
                callerCancellation.Token
            );
            // Hang up once the gateway is waiting on its outbound call, like Grafana does.
            await upstream.Connected.WaitAsync(_timeout, cancellationToken);
            await callerCancellation.CancelAsync();
            await request;
        });
        await upstream.Closed.WaitAsync(_timeout, cancellationToken);
        // Stopping drains in-flight requests, so every span has been exported afterwards.
        await app.StopAsync(cancellationToken);

        var server = Assert.Single(exportedSpans, span => span.Kind == ActivityKind.Server);
        var client = Assert.Single(exportedSpans, IsOutboundCall);

        Assert.Equal(499, server.GetTagItem("http.response.status_code"));
        Assert.True(server.GetTagItem(CallerAbortedSpanProcessor.CallerAbortedAttribute) is true);
        Assert.Equal(ActivityStatusCode.Unset, client.Status);
        Assert.Null(client.GetTagItem("error.type"));
        Assert.True(client.GetTagItem(CallerAbortedSpanProcessor.CallerAbortedAttribute) is true);
    }

    [Fact]
    public async Task FailedOutboundCall_IsNotMarked()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var exportedSpans = new List<Activity>();
        // Nothing listens on this port, so the outbound call fails while the caller is still waiting.
        await using var app = BuildApp(exportedSpans, new Uri($"http://127.0.0.1:{GetUnusedPort()}/"));
        await app.StartAsync(cancellationToken);

        using var caller = new HttpClient { BaseAddress = GetAddress(app) };
        using var response = await caller.PostAsync(
            new Uri("alerts", UriKind.Relative),
            content: null,
            cancellationToken
        );
        await app.StopAsync(cancellationToken);

        var server = Assert.Single(exportedSpans, span => span.Kind == ActivityKind.Server);
        var client = Assert.Single(exportedSpans, IsOutboundCall);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Null(server.GetTagItem(CallerAbortedSpanProcessor.CallerAbortedAttribute));
        Assert.Equal(ActivityStatusCode.Error, client.Status);
        Assert.Null(client.GetTagItem(CallerAbortedSpanProcessor.CallerAbortedAttribute));
    }

    private static WebApplication BuildApp(List<Activity> exportedSpans, Uri upstreamUri)
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.AddOpenTelemetry();
        builder.Services.ConfigureOpenTelemetryTracerProvider(tracing => tracing.AddInMemoryExporter(exportedSpans));
        builder.Services.AddHttpClient("upstream", client => client.BaseAddress = upstreamUri);

        var app = builder.Build();
        app.MapPost(
            "/alerts",
            async (IHttpClientFactory httpClientFactory, CancellationToken cancellationToken) =>
            {
                using var client = httpClientFactory.CreateClient("upstream");
                using var response = await client.PostAsync(
                    new Uri("designer", UriKind.Relative),
                    content: null,
                    cancellationToken
                );
                return Results.Ok();
            }
        );
        return app;
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

    private static bool IsOutboundCall(Activity span) =>
        span.Kind == ActivityKind.Client
        && span.GetTagItem("url.full") is string url
        && url.EndsWith("/designer", StringComparison.Ordinal);

    /// <summary>
    /// Accepts one connection but never responds, like a Designer call that is still in progress.
    /// </summary>
    private sealed class HangingUpstream : IAsyncDisposable
    {
        private readonly TcpListener _listener = new(IPAddress.Loopback, 0);
        private readonly TaskCompletionSource _connected = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public HangingUpstream()
        {
            _listener.Start();
            Uri = new Uri($"http://127.0.0.1:{((IPEndPoint)_listener.LocalEndpoint).Port}/");
            Closed = AcceptAndHoldAsync();
        }

        public Uri Uri { get; }

        public Task Connected => _connected.Task;

        /// <summary>
        /// Completes when the gateway closes its connection.
        /// </summary>
        public Task Closed { get; }

        public async ValueTask DisposeAsync()
        {
            _listener.Stop();
            try
            {
                await Closed;
            }
            catch (SocketException)
            {
                // The listener was stopped before the gateway connected.
            }
            _listener.Dispose();
        }

        private async Task AcceptAndHoldAsync()
        {
            using var connection = await _listener.AcceptTcpClientAsync();
            _connected.SetResult();
            // Hold the connection open without responding until the gateway gives up on it.
            await connection.GetStream().CopyToAsync(Stream.Null);
        }
    }
}
