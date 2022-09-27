using Altinn.App.Core.Features.DataProcessing;
using Altinn.App.PlatformServices.Tests.Implementation.TestResources;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation;

public class NullDataProcessorTests
{
    [Fact]
    public async void NullDataProcessor_ProcessDataRead_makes_no_changes_and_returns_false()
    {
        // Arrange
        var dataProcessor = new NullDataProcessor();
        DummyModel expected = new DummyModel()
        {
            Name = "Test"
        };
        object input = new DummyModel()
        {
            Name = "Test"
        };

        // Act
        var result = await dataProcessor.ProcessDataRead(new Instance(), null, input);

        // Assert
        result.Should().BeFalse();
        input.Should().BeEquivalentTo(expected);
    }
    
    [Fact]
    public async void NullDataProcessor_ProcessDataWrite_makes_no_changes_and_returns_false()
    {
        // Arrange
        var dataProcessor = new NullDataProcessor();
        DummyModel expected = new DummyModel()
        {
            Name = "Test"
        };
        object input = new DummyModel()
        {
            Name = "Test"
        };

        // Act
        var result = await dataProcessor.ProcessDataWrite(new Instance(), null, input);

        // Assert
        result.Should().BeFalse();
        input.Should().BeEquivalentTo(expected);
    }
}