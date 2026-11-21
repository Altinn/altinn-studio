#nullable disable
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataProcessing;
using Altinn.App.PlatformServices.Tests.Implementation.TestResources;
using FluentAssertions;
using Moq;

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
        var dataMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        await nullInstantiation.DataCreation(dataMutator.Object, input, new Dictionary<string, string>());

        // Assert
        input.Should().BeEquivalentTo(expected);
        dataMutator.VerifyNoOtherCalls();
    }
}
