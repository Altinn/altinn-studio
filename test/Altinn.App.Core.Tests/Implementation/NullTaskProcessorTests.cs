using Altinn.App.Core.Features.Process;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation;

public class NullTaskProcessorTests
{
    [Fact]
    public async void ProcessTaskEnd_should_do_nothing()
    {
        // Arrange
        var taskProcessor = new NullTaskProcessor();
        Instance expected = new Instance();
        Instance input = new Instance();
        
        // Act
        await taskProcessor.ProcessTaskEnd("123", input);
        
        // Assert
        input.Should().BeEquivalentTo(expected);
    }
}