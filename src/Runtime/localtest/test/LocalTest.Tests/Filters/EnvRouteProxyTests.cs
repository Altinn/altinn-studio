using LocalTest.Configuration;
using LocalTest.Filters;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace LocalTest.Tests.Filters;

public class EnvRouteProxyTests
{
    [Fact]
    public void CreateRequestConfig_DefaultsToTheWorkflowEngineMaxStepCommandTimeout()
    {
        var config = EnvRouteProxy.CreateRequestConfig(new LocalPlatformSettings());

        Assert.Equal(TimeSpan.FromHours(2), config.ActivityTimeout);
    }

    [Fact]
    public void CreateRequestConfig_UsesTheConfiguredProxyActivityTimeout()
    {
        var settings = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?> { ["LocalPlatformSettings:ProxyActivityTimeout"] = "00:30:00" }
            )
            .Build()
            .GetSection("LocalPlatformSettings")
            .Get<LocalPlatformSettings>();

        var config = EnvRouteProxy.CreateRequestConfig(settings!);

        Assert.Equal(TimeSpan.FromMinutes(30), config.ActivityTimeout);
    }
}
