using System.Globalization;
using System.Net.Sockets;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Assistant.Runner.Tests;

/// <summary>The runner API on a free port, with <see cref="FakeJobRunner"/> in place of the real jobs.</summary>
internal sealed class TestRunnerApi : IAsyncDisposable
{
    private readonly WebApplication _app;

    private TestRunnerApi(WebApplication app, Uri address, FakeJobRunner jobs)
    {
        _app = app;
        Address = address;
        Jobs = jobs;
        Client = new HttpClient { BaseAddress = address };
    }

    public Uri Address { get; }

    public HttpClient Client { get; }

    public FakeJobRunner Jobs { get; }

    public static async Task<TestRunnerApi> StartAsync()
    {
        var builder = WebApplication.CreateSlimBuilder(
            new WebApplicationOptions { EnvironmentName = Environments.Development }
        );
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.AddRunnerApi();
        var jobs = new FakeJobRunner();
        builder.Services.AddSingleton<IJobRunner>(jobs);

        var app = builder.Build();
        app.MapRunnerApi();
        await app.StartAsync(TestContext.Current.CancellationToken);

        var address = app
            .Services.GetRequiredService<IServer>()
            .Features.GetRequiredFeature<IServerAddressesFeature>()
            .Addresses.Single();
        return new TestRunnerApi(app, new Uri(address), jobs);
    }

    /// <summary>
    /// Announces <paramref name="contentLength"/> bytes and sends none, and returns the status code.
    /// HttpClient would send the whole body first.
    /// </summary>
    public async Task<int> PostAnnouncedLengthAsync(string path, long contentLength)
    {
        using var tcp = new TcpClient();
        await tcp.ConnectAsync(Address.Host, Address.Port, TestContext.Current.CancellationToken);
        await using var stream = tcp.GetStream();
        var request =
            $"POST {path} HTTP/1.1\r\nHost: {Address.Authority}\r\nContent-Type: application/gzip\r\n"
            + $"Content-Length: {contentLength.ToString(CultureInfo.InvariantCulture)}\r\nConnection: close\r\n\r\n";
        await stream.WriteAsync(Encoding.ASCII.GetBytes(request), TestContext.Current.CancellationToken);

        using var reader = new StreamReader(stream, Encoding.ASCII);
        var statusLine =
            await reader.ReadLineAsync(TestContext.Current.CancellationToken)
            ?? throw new InvalidOperationException($"No response to POST {path}.");
        return int.Parse(statusLine.Split(' ')[1], CultureInfo.InvariantCulture);
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await _app.DisposeAsync();
    }
}
