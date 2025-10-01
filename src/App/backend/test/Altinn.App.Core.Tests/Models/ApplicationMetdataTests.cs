using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Models;

public class ApplicationMetdataTests
{
    [Fact]
    public void ConstructorSetIdAndAppIdentifier()
    {
        ApplicationMetadata metadata = new ApplicationMetadata("ttd/test");
        metadata.Id.Should().BeEquivalentTo("ttd/test");
        AppIdentifier expected = new AppIdentifier("ttd/test");
        metadata.AppIdentifier.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void UpdatingIdUpdatesAppIdentifier()
    {
        ApplicationMetadata metadata = new ApplicationMetadata("ttd/test");
        metadata.Id.Should().BeEquivalentTo("ttd/test");
        AppIdentifier expected = new AppIdentifier("ttd/test");
        metadata.AppIdentifier.Should().BeEquivalentTo(expected);
        metadata.Id = "ttd/updated";
        metadata.Id.Should().BeEquivalentTo("ttd/updated");
        AppIdentifier expectedUpdate = new AppIdentifier("ttd/updated");
        metadata.AppIdentifier.Should().BeEquivalentTo(expectedUpdate);
    }

    [Fact]
    public void UpdatingIdFailsIfInvalidApplicationIdFormat()
    {
        ApplicationMetadata metadata = new ApplicationMetadata("ttd/test");
        metadata.Id.Should().BeEquivalentTo("ttd/test");
        AppIdentifier expected = new AppIdentifier("ttd/test");
        metadata.AppIdentifier.Should().BeEquivalentTo(expected);
        Assert.Throws<ArgumentOutOfRangeException>(() => metadata.Id = "invalid");
        metadata.AppIdentifier.Should().BeEquivalentTo(expected);
    }
}
