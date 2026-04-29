using Altinn.App.Core.Features.Notifications.Cancellation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Features.Notifications.Cancellation;

public class SendOnProcessNotEndedTests
{
    private readonly SendOnProcessNotEnded _sut = new();

    [Fact]
    public void ShouldSend_WhenProcessHasNotEnded_ReturnsTrue()
    {
        // Arrange
        var instance = new Instance { Process = new ProcessState { Ended = null } };

        // Act
        bool result = _sut.ShouldSend(instance);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void ShouldSend_WhenProcessHasEnded_ReturnsFalse()
    {
        // Arrange
        var instance = new Instance { Process = new ProcessState { Ended = DateTime.UtcNow } };

        // Act
        bool result = _sut.ShouldSend(instance);

        // Assert
        Assert.False(result);
    }
}
