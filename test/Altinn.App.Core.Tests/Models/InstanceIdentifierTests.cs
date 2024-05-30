#nullable disable
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.PlatformServices.Tests.Models;

public class InstanceIdentifierTests
{
    [Theory]
    [InlineData(
        "/yabbin/hvem-er-hvem/instances/512345/2539cacc-1f49-4852-907b-d184e7285a60/process/next",
        512345,
        "2539cacc-1f49-4852-907b-d184e7285a60"
    )]
    [InlineData(
        @"https://www.altinn.no/yabbin/hvem-er-hvem/instances/512345/2539cacc-1f49-4852-907b-d184e7285a60/process/next",
        512345,
        "2539cacc-1f49-4852-907b-d184e7285a60"
    )]
    [InlineData(
        "/yabbin/hvem-er-hvem/instance/512345/2539cacc-1f49-4852-907b-d184e7285a60/process/next",
        512345,
        "2539cacc-1f49-4852-907b-d184e7285a60"
    )]
    public void Url_CreateFromUrl_ShouldReturnOwnerIdAndInstaceGuid(
        string url,
        int expectedInstanceOwnerId,
        Guid expectedInstanceGuid
    )
    {
        var instanceIdentifier = InstanceIdentifier.CreateFromUrl(url);

        Assert.Equal(expectedInstanceOwnerId, instanceIdentifier.InstanceOwnerPartyId);
        Assert.Equal(expectedInstanceGuid, instanceIdentifier.InstanceGuid);
        Assert.Equal($"{expectedInstanceOwnerId}/{expectedInstanceGuid}", instanceIdentifier.GetInstanceId());
        instanceIdentifier.IsNoInstance.Should().BeFalse();
    }

    [Fact]
    public void Url_CreateFromUrl_ShouldThrowExceptionOnInvalidUrl()
    {
        var url = "/yabbin/hvem-er-hvem/512345/2539cacc-1f49-4852-907b-d184e7285a60/process/next";

        Action action = () => InstanceIdentifier.CreateFromUrl(url);

        action.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(512345, "2539cacc-1f49-4852-907b-d184e7285a60")]
    public void Constructor_FromParts_ShouldReturnInstance(int expectedInstanceOwnerId, Guid expectedInstanceGuid)
    {
        var instanceIdentifier = new InstanceIdentifier(expectedInstanceOwnerId, expectedInstanceGuid);

        instanceIdentifier.GetInstanceId().Should().Be($"{expectedInstanceOwnerId}/{expectedInstanceGuid}");
        instanceIdentifier.IsNoInstance.Should().BeFalse();
    }

    [Fact]
    public void Constructor_FromInstanceId_ShouldReturnInstance()
    {
        var instanceId = @"512345/2539cacc-1f49-4852-907b-d184e7285a60";

        var instanceIdentifier = new InstanceIdentifier(instanceId);

        instanceIdentifier.InstanceOwnerPartyId.Should().Be(512345);
        instanceIdentifier.InstanceGuid.Should().Be("2539cacc-1f49-4852-907b-d184e7285a60");
        instanceIdentifier.GetInstanceId().Should().Be("512345/2539cacc-1f49-4852-907b-d184e7285a60");
        instanceIdentifier.ToString().Should().Be("512345/2539cacc-1f49-4852-907b-d184e7285a60");
        instanceIdentifier.IsNoInstance.Should().BeFalse();
    }

    [Fact]
    public void InstanceIdentifier_NoInstance_Returns_Object_With_IsNoInstance_True()
    {
        var instanceIdentifier = InstanceIdentifier.NoInstance;

        instanceIdentifier.IsNoInstance.Should().BeTrue();
    }

    [Fact]
    public void InstanceIdentifier_NoInstance_GetInstanceId_throws_ArgumentNullException()
    {
        var instanceIdentifier = InstanceIdentifier.NoInstance;

        Assert.Throws<ArgumentNullException>(() => instanceIdentifier.GetInstanceId());
    }
}
