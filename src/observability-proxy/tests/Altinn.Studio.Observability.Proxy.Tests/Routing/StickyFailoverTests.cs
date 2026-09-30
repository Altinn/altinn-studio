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
        var policy = NewPolicy();

        Assert.Same(First, Pick(policy, "traces", Second, First));
    }

    [Fact]
    public void FailsOver_WhenTheCurrentDestinationIsUnhealthy()
    {
        var policy = NewPolicy();
        Pick(policy, "traces", First, Second);

        Assert.Same(Second, Pick(policy, "traces", Second));
    }

    [Fact]
    public void StaysOnTheSecondDestination_WhenTheFirstIsHealthyAgain()
    {
        // A copy that is back may still be catching up, or be missing data for good.
        var policy = NewPolicy();
        Pick(policy, "traces", First, Second);
        Pick(policy, "traces", Second);

        Assert.Same(Second, Pick(policy, "traces", First, Second));
    }

    [Fact]
    public void ReturnsToTheFirstDestination_WhenTheSecondFails()
    {
        var policy = NewPolicy();
        Pick(policy, "traces", First, Second);
        Pick(policy, "traces", Second);

        Assert.Same(First, Pick(policy, "traces", First));
    }

    [Fact]
    public void StartsOnTheSecondDestination_WhenTheFirstIsUnhealthyAtStartup()
    {
        var policy = NewPolicy();
        Pick(policy, "traces", Second);

        Assert.Same(Second, Pick(policy, "traces", First, Second));
    }

    [Fact]
    public void KeepsAChoicePerCluster()
    {
        var policy = NewPolicy();
        Pick(policy, "traces", First, Second);
        Pick(policy, "traces", Second);

        Assert.Same(First, Pick(policy, "logs", First, Second));
    }

    [Fact]
    public void ReturnsNull_WhenNoDestinationIsHealthy()
    {
        Assert.Null(Pick(NewPolicy(), "traces"));
    }

    private static StickyFailover NewPolicy() => new(NullLogger<StickyFailover>.Instance);

    private static DestinationState? Pick(
        StickyFailover policy,
        string clusterId,
        params DestinationState[] available
    ) => policy.Choose(clusterId, available);
}
