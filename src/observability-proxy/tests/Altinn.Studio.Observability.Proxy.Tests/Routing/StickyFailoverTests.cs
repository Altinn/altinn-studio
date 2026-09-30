using Altinn.Studio.Observability.Proxy.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using Yarp.ReverseProxy.Model;

namespace Altinn.Studio.Observability.Proxy.Tests.Routing;

public sealed class StickyFailoverTests
{
    private static readonly DestinationState First = new("instance-0");
    private static readonly DestinationState Second = new("instance-1");

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
    public void ReturnsNull_WhenNoDestinationIsHealthy()
    {
        Assert.Null(Pick(NewFailover(), "traces"));
    }

    private static StickyFailover NewFailover() => new(NullLogger<StickyFailover>.Instance);

    private static DestinationState? Pick(
        StickyFailover failover,
        string clusterId,
        params DestinationState[] available
    ) => failover.Choose(clusterId, available);
}
