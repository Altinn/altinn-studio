using System.Diagnostics.Metrics;
using Altinn.Studio.Observability.Proxy.Routing;
using Altinn.Studio.Observability.Proxy.Telemetry;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Yarp.ReverseProxy.Model;

namespace Altinn.Studio.Observability.Proxy.Tests.Routing;

public sealed class StickyFailoverTests : IDisposable
{
    private readonly ServiceProvider _services = new ServiceCollection().AddMetrics().BuildServiceProvider();

    private static readonly DestinationState First = new("a");
    private static readonly DestinationState Second = new("b");

    [Fact]
    public void Picks_TheFirstDestination_WhenBothAreHealthy()
    {
        var failover = NewFailover();

        Assert.Same(First, Pick(failover, "traces", Second, First));
    }

    [Fact]
    public void FailsOver_WhenTheCurrentDestinationIsUnhealthy()
    {
        var failover = NewFailover();
        Pick(failover, "traces", First, Second);

        Assert.Same(Second, Pick(failover, "traces", Second));
    }

    [Fact]
    public void StaysOnTheSecondDestination_WhenTheFirstIsHealthyAgain()
    {
        // A copy that is back may still be catching up, or be missing data for good.
        var failover = NewFailover();
        Pick(failover, "traces", First, Second);
        Pick(failover, "traces", Second);

        Assert.Same(Second, Pick(failover, "traces", First, Second));
    }

    [Fact]
    public void ReturnsToTheFirstDestination_WhenTheSecondFails()
    {
        var failover = NewFailover();
        Pick(failover, "traces", First, Second);
        Pick(failover, "traces", Second);

        Assert.Same(First, Pick(failover, "traces", First));
    }

    [Fact]
    public void StartsOnTheSecondDestination_WhenTheFirstIsUnhealthyAtStartup()
    {
        var failover = NewFailover();
        Pick(failover, "traces", Second);

        Assert.Same(Second, Pick(failover, "traces", First, Second));
    }

    [Fact]
    public void KeepsAChoicePerCluster()
    {
        var failover = NewFailover();
        Pick(failover, "traces", First, Second);
        Pick(failover, "traces", Second);

        Assert.Same(First, Pick(failover, "logs", First, Second));
    }

    [Fact]
    public void Peek_SaysWhereReadsWouldGo_WithoutMovingThem()
    {
        var failover = NewFailover();
        Pick(failover, "traces", First, Second);

        Assert.Same(Second, failover.Peek("traces", [Second]));
        // Reads did not move: with the first healthy again, they are still there.
        Assert.Same(First, Pick(failover, "traces", First, Second));
        Assert.Null(failover.Peek("traces", []));
    }

    [Fact]
    public void ReturnsNull_WhenNoDestinationIsHealthy()
    {
        Assert.Null(Pick(NewFailover(), "traces"));
    }

    public void Dispose() => _services.Dispose();

    private StickyFailover NewFailover() =>
        new(
            NullLogger<StickyFailover>.Instance,
            new ObservabilityProxyMetrics(_services.GetRequiredService<IMeterFactory>())
        );

    private static DestinationState? Pick(
        StickyFailover failover,
        string clusterId,
        params DestinationState[] available
    ) => failover.Choose(clusterId, available);
}
