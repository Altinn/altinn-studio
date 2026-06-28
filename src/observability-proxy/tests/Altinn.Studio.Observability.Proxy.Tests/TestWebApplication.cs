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

    private TestWebApplication(WebApplication app, string address)
    {
        _app = app;
        Address = address;
        Client = new HttpClient { BaseAddress = new Uri(address) };
    }

    public string Address { get; }

    public HttpClient Client { get; }

    public static async Task<TestWebApplication> StartProxyAsync(IReadOnlyDictionary<string, string?> configuration)
    {
        var builder = CreateBuilder();
        builder.Configuration.AddInMemoryCollection(configuration);
        builder.AddObservabilityProxy();

        var app = builder.Build();
        app.UseObservabilityProxy();
        return await StartAsync(app);
    }

    public static async Task<TestWebApplication> StartDownstreamAsync()
    {
        var builder = CreateBuilder();
        var app = builder.Build();

        app.Map(
            "/{**path}",
            async context =>
            {
                context.Response.Headers["X-Observed-Method"] = context.Request.Method;
                context.Response.Headers["X-Observed-Path"] = $"{context.Request.Path}{context.Request.QueryString}";

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
                await context.Response.WriteAsync(body, context.RequestAborted);
            }
        );

        return await StartAsync(app);
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

    private static async Task<TestWebApplication> StartAsync(WebApplication app)
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

        return new TestWebApplication(app, address);
    }
}
