using System.Threading;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Designer.Tests.Fixtures;

internal static class TestWebHostDefaults
{
    private const string ReloadConfigOnChangeKey = "hostBuilder:reloadConfigOnChange";

    public static void Configure(IWebHostBuilder builder)
    {
        builder.UseSetting(ReloadConfigOnChangeKey, bool.FalseString);
        builder.ConfigureServices(services =>
            services.ConfigureHttpClientDefaults(client => client.SetHandlerLifetime(Timeout.InfiniteTimeSpan))
        );
    }
}
