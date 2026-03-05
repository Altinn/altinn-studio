using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Hosting;

namespace Designer.Tests.Fixtures;

public class StudioOidcGiteaWebAppApplicationFactoryFixture<TEntryPoint> : WebApplicationFactory<TEntryPoint>
    where TEntryPoint : class
{
    public string DesignerUrl { get; set; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseUrls(DesignerUrl);
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var dummyHost = builder.Build();

        builder.ConfigureWebHost(webHostBuilder => webHostBuilder.UseKestrel());

        var host = builder.Build();
        host.Start();

        return dummyHost;
    }
}
