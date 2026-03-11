using System;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Time.Testing;

namespace Designer.Tests.Fixtures;

public class StudioOidcGiteaWebAppApplicationFactoryFixture<TEntryPoint> : WebApplicationFactory<TEntryPoint>
    where TEntryPoint : class
{
    public string DesignerUrl { get; set; }

    public FakeTimeProvider FakeTimeProvider { get; } = new(DateTimeOffset.UtcNow);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseUrls(DesignerUrl);
        builder.ConfigureServices(services =>
        {
            services.AddSingleton<TimeProvider>(_ => FakeTimeProvider);
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var dummyHost = builder.Build();

        builder.ConfigureWebHost(webHostBuilder =>
        {
            webHostBuilder.UseKestrel();
            webHostBuilder.ConfigureServices(services =>
            {
                services.AddSingleton<TimeProvider>(_ => FakeTimeProvider);
            });
        });

        var host = builder.Build();
        host.Start();

        return dummyHost;
    }
}
