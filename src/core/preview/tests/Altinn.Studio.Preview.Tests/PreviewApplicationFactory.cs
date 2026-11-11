using System.Globalization;
using Altinn.Studio.Preview.Hosting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.Studio.Preview.Tests;

/// <summary>
/// The service in process, over a repository root in a temporary directory, with sessions in memory unless a test
/// passes a cache of its own.
/// </summary>
internal sealed class PreviewApplicationFactory(IDistributedCache? sessionCache = null) : WebApplicationFactory<Program>
{
    public const string PublicBaseUrl = "https://preview.test";
    public const string StudioOrigin = "https://studio.test";

    /// <summary>
    /// The port the service takes a request to have arrived on. A test server has no sockets, so each client says which
    /// port it stands for, and the endpoints' port checks see that.
    /// </summary>
    private const string PortHeader = "X-Test-Local-Port";

    public RepositoryRoot Root { get; } = new();

    /// <summary>A client of the public port, as a browser is.</summary>
    public HttpClient CreatePublicClient() => CreateClientOnPort(PreviewPorts.Public);

    /// <summary>A client of the internal port, as Designer is.</summary>
    public HttpClient CreateInternalClient() => CreateClientOnPort(PreviewPorts.Internal);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration(
            (_, configuration) =>
                configuration.AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["Preview:RepositoryRoot"] = Root.Path,
                        ["Preview:PublicBaseUrl"] = PublicBaseUrl,
                        ["Preview:StudioOrigin"] = StudioOrigin,
                        ["Preview:RedisConnectionString"] = "not-used:6379",
                    }
                )
        );
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IDistributedCache>();
            if (sessionCache is null)
            {
                services.AddDistributedMemoryCache();
            }
            else
            {
                services.AddSingleton(sessionCache);
            }
            services.AddSingleton<IStartupFilter, LocalPortFromHeader>();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            Root.Dispose();
        }
    }

    private HttpClient CreateClientOnPort(int port)
    {
        HttpClient client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Add(PortHeader, port.ToString(CultureInfo.InvariantCulture));
        return client;
    }

    private sealed class LocalPortFromHeader : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) =>
            app =>
            {
                app.Use(
                    (context, nextMiddleware) =>
                    {
                        context.Connection.LocalPort = int.Parse(
                            context.Request.Headers[PortHeader].ToString(),
                            CultureInfo.InvariantCulture
                        );
                        return nextMiddleware(context);
                    }
                );
                next(app);
            };
    }
}
