using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Text;
using Altinn.Studio.Observability.Proxy.Hosting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Observability.Proxy.Tests;

internal sealed class TestWebApplication : IAsyncDisposable
{
    private readonly WebApplication _app;

    private TestWebApplication(
        WebApplication app,
        string address,
        string? metricsAddress,
        ConcurrentQueue<string> receivedPaths
    )
    {
        _app = app;
        Address = address;
        ReceivedPaths = receivedPaths;
        Client = new HttpClient { BaseAddress = new Uri(address) };
        MetricsClient = metricsAddress is null ? null : new HttpClient { BaseAddress = new Uri(metricsAddress) };
    }

    public string Address { get; }

    /// <summary>A client of the proxy's metrics port, as the scraper is; <c>null</c> for a downstream.</summary>
    public HttpClient? MetricsClient { get; }

    public HttpClient Client { get; }

    /// <summary>
    /// Every path and query a downstream was sent other than health probes, so a test can show a
    /// request never left the proxy.
    /// </summary>
    public ConcurrentQueue<string> ReceivedPaths { get; }

    /// <summary>
    /// The proxy as it runs in the cluster: traffic on one port and metrics on another, whose number
    /// the proxy has to be told, so it is picked here rather than left to the system.
    /// </summary>
    public static async Task<TestWebApplication> StartProxyAsync(IReadOnlyDictionary<string, string?> configuration)
    {
        var metricsPort = FreeLoopbackPort();
        var builder = CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0", $"http://127.0.0.1:{metricsPort}");
        builder.Configuration.AddInMemoryCollection(configuration);
        builder.Configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["ObservabilityProxy:MetricsPort"] = metricsPort.ToString(CultureInfo.InvariantCulture),
            }
        );
        builder.AddObservabilityProxy();

        var app = builder.Build();
        app.UseObservabilityProxy();
        return await StartAsync(app, new ConcurrentQueue<string>(), metricsPort);
    }

    /// <summary>What the proxy's metrics port serves at <c>/metrics</c>.</summary>
    public async Task<ScrapedMetrics> ScrapeAsync()
    {
        var metricsClient = MetricsClient ?? throw new InvalidOperationException("Only the proxy serves metrics.");
        var body = await metricsClient.GetStringAsync(
            new Uri("/metrics", UriKind.Relative),
            TestContext.Current.CancellationToken
        );
        return ScrapedMetrics.Parse(body);
    }

    /// <summary>
    /// Scrapes until <paramref name="condition"/> holds. A request is recorded once its response
    /// has been sent, so a client can see the response before the request is counted, and the
    /// exporter caches a scrape for a short while.
    /// </summary>
    public async Task<ScrapedMetrics> ScrapeUntilAsync(Func<ScrapedMetrics, bool> condition)
    {
        var deadline = DateTime.UtcNow.AddSeconds(15);
        while (true)
        {
            var metrics = await ScrapeAsync();
            if (condition(metrics) || DateTime.UtcNow > deadline)
            {
                return metrics;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(100), TestContext.Current.CancellationToken);
        }
    }

    /// <summary>
    /// A storage instance whose health can be switched: <c>/health</c> answers 200 or 503 as
    /// <paramref name="isHealthy"/> says, and every other request is answered with its name.
    /// </summary>
    public static async Task<TestWebApplication> StartNamedDownstreamAsync(string name, Func<bool> isHealthy)
    {
        var app = CreateBuilder().Build();
        app.Map(
            "/{**path}",
            (HttpContext context) =>
            {
                if (context.Request.Path == "/health")
                {
                    context.Response.StatusCode = isHealthy()
                        ? StatusCodes.Status200OK
                        : StatusCodes.Status503ServiceUnavailable;
                    return Task.CompletedTask;
                }

                return context.Response.WriteAsync(name, context.RequestAborted);
            }
        );
        return await StartAsync(app, new ConcurrentQueue<string>());
    }

    public static async Task<TestWebApplication> StartDownstreamAsync()
    {
        var builder = CreateBuilder();
        // The agents have no body limit of their own below the proxy's.
        builder.WebHost.ConfigureKestrel(kestrel => kestrel.Limits.MaxRequestBodySize = null);
        var app = builder.Build();
        var receivedPaths = new ConcurrentQueue<string>();

        app.Map(
            "/{**path}",
            async context =>
            {
                // The read clusters' active health checks probe /health on their own schedule.
                if (context.Request.Path != "/health")
                {
                    receivedPaths.Enqueue($"{context.Request.Path}{context.Request.QueryString}");
                }

                context.Response.Headers["X-Observed-Method"] = context.Request.Method;
                context.Response.Headers["X-Observed-Path"] = $"{context.Request.Path}{context.Request.QueryString}";
                context.Response.Headers["X-Observed-Headers"] = string.Join(
                    ",",
                    context.Request.Headers.Keys.Order(StringComparer.OrdinalIgnoreCase)
                );

                if (context.Request.Headers.TryGetValue("X-Grafana-Org-Id", out var grafanaOrgId))
                {
                    context.Response.Headers["X-Observed-Grafana-Org"] = grafanaOrgId;
                }

                if (context.Request.Headers.TryGetValue("X-Observability-Source", out var sourceIdentity))
                {
                    context.Response.Headers["X-Observed-Source"] = sourceIdentity;
                }

                if (context.Request.Headers.TryGetValue("VL-Stream-Fields", out var streamFields))
                {
                    context.Response.Headers["X-Observed-Stream-Fields"] = streamFields;
                }

                if (context.Request.Headers.TryGetValue("Authorization", out var authorization))
                {
                    context.Response.Headers["X-Observed-Authorization"] = authorization;
                }

                using var reader = new StreamReader(context.Request.Body);
                var body = await reader.ReadToEndAsync(context.RequestAborted);
                context.Response.Headers["X-Observed-Body-Length"] = body.Length.ToString(
                    System.Globalization.CultureInfo.InvariantCulture
                );
                await context.Response.WriteAsync(body.Length > 1024 ? string.Empty : body, context.RequestAborted);
            }
        );

        return await StartAsync(app, receivedPaths);
    }

    /// <summary>
    /// Sends <paramref name="rawTarget"/> exactly as written, and returns the status code.
    /// HttpClient normalizes dot segments and escapes before sending, so a test of what the proxy
    /// does with an unusual path has to write the request line itself. The request announces
    /// <paramref name="contentLength"/> bytes and sends none, which is enough for a length check.
    /// </summary>
    public async Task<int> SendRawAsync(string method, string rawTarget, string? bearerToken, long contentLength = 0)
    {
        var uri = new Uri(Address);
        using var tcp = new TcpClient();
        await tcp.ConnectAsync(uri.Host, uri.Port, TestContext.Current.CancellationToken);
        await using var stream = tcp.GetStream();

        var request = new StringBuilder()
            .Append(method)
            .Append(' ')
            .Append(rawTarget)
            .Append(" HTTP/1.1\r\n")
            .Append("Host: ")
            .Append(uri.Authority)
            .Append("\r\n")
            .Append("Content-Length: ")
            .Append(contentLength.ToString(System.Globalization.CultureInfo.InvariantCulture))
            .Append("\r\nConnection: close\r\n");
        if (bearerToken is not null)
        {
            request.Append("Authorization: Bearer ").Append(bearerToken).Append("\r\n");
        }

        request.Append("\r\n");
        await stream.WriteAsync(Encoding.ASCII.GetBytes(request.ToString()), TestContext.Current.CancellationToken);

        using var reader = new StreamReader(stream, Encoding.ASCII);
        var statusLine = await reader.ReadLineAsync(TestContext.Current.CancellationToken);
        if (statusLine is null)
        {
            throw new InvalidOperationException($"No response to {method} {rawTarget}.");
        }

        return int.Parse(statusLine.Split(' ')[1], System.Globalization.CultureInfo.InvariantCulture);
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        MetricsClient?.Dispose();
        await _app.DisposeAsync();
    }

    private static WebApplicationBuilder CreateBuilder()
    {
        var builder = WebApplication.CreateSlimBuilder(
            new WebApplicationOptions
            {
                EnvironmentName = Environments.Development,
                ContentRootPath = AppContext.BaseDirectory,
            }
        );

        builder.WebHost.UseUrls("http://127.0.0.1:0");
        return builder;
    }

    private static async Task<TestWebApplication> StartAsync(
        WebApplication app,
        ConcurrentQueue<string> receivedPaths,
        int? metricsPort = null
    )
    {
        await app.StartAsync();

        var addresses =
            app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()?.Addresses.ToList()
            ?? [];
        var metricsAddress = addresses.SingleOrDefault(candidate => new Uri(candidate).Port == metricsPort);
        var address = addresses.SingleOrDefault(candidate => candidate != metricsAddress);

        if (string.IsNullOrWhiteSpace(address) || (metricsPort is not null && metricsAddress is null))
        {
            throw new InvalidOperationException("Unable to determine test application address.");
        }

        return new TestWebApplication(app, address, metricsAddress, receivedPaths);
    }

    private static int FreeLoopbackPort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }
}
