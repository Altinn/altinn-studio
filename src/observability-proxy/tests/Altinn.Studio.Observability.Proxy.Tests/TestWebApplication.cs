using System.Collections.Concurrent;
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

    private TestWebApplication(WebApplication app, string address, ConcurrentQueue<string> receivedPaths)
    {
        _app = app;
        Address = address;
        ReceivedPaths = receivedPaths;
        Client = new HttpClient { BaseAddress = new Uri(address) };
    }

    public string Address { get; }

    public HttpClient Client { get; }

    /// <summary>
    /// Every path and query a downstream was sent other than health probes, so a test can show a
    /// request never left the proxy.
    /// </summary>
    public ConcurrentQueue<string> ReceivedPaths { get; }

    public static async Task<TestWebApplication> StartProxyAsync(IReadOnlyDictionary<string, string?> configuration)
    {
        var builder = CreateBuilder();
        builder.Configuration.AddInMemoryCollection(configuration);
        builder.AddObservabilityProxy();

        var app = builder.Build();
        app.UseObservabilityProxy();
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
        await _app.DisposeAsync();
    }

    private static WebApplicationBuilder CreateBuilder()
    {
        var builder = WebApplication.CreateBuilder(
            new WebApplicationOptions
            {
                EnvironmentName = Environments.Development,
                ContentRootPath = AppContext.BaseDirectory,
            }
        );

        builder.WebHost.UseUrls("http://127.0.0.1:0");
        return builder;
    }

    private static async Task<TestWebApplication> StartAsync(WebApplication app, ConcurrentQueue<string> receivedPaths)
    {
        await app.StartAsync();

        var address = app
            .Services.GetRequiredService<IServer>()
            .Features.Get<IServerAddressesFeature>()
            ?.Addresses.Single();

        if (string.IsNullOrWhiteSpace(address))
        {
            throw new InvalidOperationException("Unable to determine test application address.");
        }

        return new TestWebApplication(app, address, receivedPaths);
    }
}
