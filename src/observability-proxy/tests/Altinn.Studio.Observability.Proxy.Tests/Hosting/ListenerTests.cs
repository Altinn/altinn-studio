using Altinn.Studio.Observability.Proxy.Hosting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace Altinn.Studio.Observability.Proxy.Tests.Hosting;

/// <summary>
/// The proxy listens on its traffic port and its metrics port, set in its own configuration, and
/// refuses to start on settings that would lose the metrics or serve traffic as metrics.
/// </summary>
public sealed class ListenerTests
{
    [Fact]
    public void Urls_AreRefused()
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.WebHost.UseUrls("http://+:8080", "http://+:9091");

        var exception = Assert.Throws<InvalidOperationException>(() => builder.AddObservabilityProxy());

        Assert.Contains("ASPNETCORE_URLS", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void TheSamePortForTrafficAndMetrics_IsRefused()
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["ObservabilityProxy:Port"] = "9090",
                ["ObservabilityProxy:MetricsPort"] = "9090",
            }
        );

        var exception = Assert.Throws<InvalidOperationException>(() => builder.AddObservabilityProxy());

        Assert.Contains("ObservabilityProxy:MetricsPort", exception.Message, StringComparison.Ordinal);
    }
}
