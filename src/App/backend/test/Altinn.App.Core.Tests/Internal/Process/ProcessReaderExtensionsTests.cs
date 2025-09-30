using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessReaderExtensionsTests
{
    [Fact]
    public void IsActionAllowedForTask_ActionIsEmpty_ReturnsFalse()
    {
        // Arrange
        var processReaderMock = new Mock<IProcessReader>();

        // Act
        bool result = processReaderMock.Object.IsActionAllowedForTask("taskId", string.Empty);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsActionAllowedForTask_ActionNotInAltinnActions_ReturnsFalse()
    {
        // Arrange
        var processReaderMock = new Mock<IProcessReader>();
        processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { AltinnActions = [new AltinnAction("sign")] });

        // Act
        bool result = processReaderMock.Object.IsActionAllowedForTask("taskId", "pay");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsActionAllowedForTask_ActionInAltinnActions_ReturnsTrue()
    {
        // Arrange
        var processReaderMock = new Mock<IProcessReader>();
        processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { AltinnActions = [new AltinnAction("sign"), new AltinnAction("pay")] });

        // Act
        bool result = processReaderMock.Object.IsActionAllowedForTask("taskId", "pay");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsActionAllowedForTask_AltinnTaskExtensionIsNull_ReturnsFalse()
    {
        // Arrange
        var processReaderMock = new Mock<IProcessReader>();
        processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns((AltinnTaskExtension?)null);

        // Act
        bool result = processReaderMock.Object.IsActionAllowedForTask("taskId", "pay");

        // Assert
        Assert.False(result);
    }
}
