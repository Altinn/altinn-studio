#nullable disable
using Altinn.App.Core.Features.DataProcessing;
using Altinn.App.PlatformServices.Tests.Implementation.TestResources;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;

namespace Altinn.App.PlatformServices.Tests.Features.DataProcessing;

public class NullInstantiationProcessTests
{
    [Fact]
    public async Task NullInstantiationTest_DataCreation_changes_nothing()
    {
        // Arrange
        var nullInstantiation = new NullInstantiationProcessor();
        DummyModel expected = new DummyModel() { Name = "Test" };
        object input = new DummyModel() { Name = "Test" };

        // Act
        await nullInstantiation.DataCreation(new Instance(), input, new Dictionary<string, string>());

        // Assert
        input.Should().BeEquivalentTo(expected);
    }
}
