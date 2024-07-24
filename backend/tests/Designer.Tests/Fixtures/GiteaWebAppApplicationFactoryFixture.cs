using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Hosting;

namespace Designer.Tests.Fixtures;

// Class will actually spin up a web host which will be used for integration tests.
public class GiteaWebAppApplicationFactoryFixture<TEntryPoint> : WebApplicationFactory<TEntryPoint> where TEntryPoint : class
{
    public string HostUrl => "http://localhost:5000";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseUrls(HostUrl);
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
