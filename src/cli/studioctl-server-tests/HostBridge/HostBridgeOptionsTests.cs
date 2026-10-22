using Altinn.Studio.StudioctlServer.HostBridge;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Studioctl.Tests.HostBridge;

public sealed class HostBridgeOptionsTests
{
    [Fact]
    public void RequestTimeout_DefaultsToTheWorkflowEngineMaxStepCommandTimeout()
    {
        var options = ResolveOptions(new Dictionary<string, string?>());

        Assert.Equal(TimeSpan.FromHours(2), options.RequestTimeout);
    }

    [Fact]
    public void RequestTimeout_IsReadFromRequestTimeoutSeconds()
    {
        var options = ResolveOptions(new Dictionary<string, string?> { ["HostBridge:RequestTimeoutSeconds"] = "1800" });

        Assert.Equal(TimeSpan.FromMinutes(30), options.RequestTimeout);
    }

    [Fact]
    public void CreateHttpClient_UsesTheRequestTimeout()
    {
        using var client = HostBridgeConnector.CreateHttpClient(TimeSpan.FromHours(2));

        Assert.Equal(TimeSpan.FromHours(2), client.Timeout);
    }

    private static HostBridgeOptions ResolveOptions(Dictionary<string, string?> values)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddHostBridgeServices(configuration);

        using var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<HostBridgeOptions>();
    }
}
