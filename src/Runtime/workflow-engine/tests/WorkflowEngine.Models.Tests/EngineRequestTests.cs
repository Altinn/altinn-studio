namespace WorkflowEngine.Models.Tests;

public class EngineRequestTests
{
    [Fact]
    public void IsValid_ReturnsTrue_WhenStepsArePresent()
    {
        // Arrange
        var request = new EngineRequest(
            "key-1",
            "op-1",
            new InstanceInformation
            {
                Org = "ttd",
                App = "app",
                InstanceOwnerPartyId = 1,
                InstanceGuid = Guid.NewGuid(),
            },
            new Actor { UserIdOrOrgNumber = "user-1" },
            DateTimeOffset.UtcNow,
            null,
            [new StepRequest { Command = new Command.Debug.Noop() }]
        );

        // Act
        var result = request.IsValid();

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsValid_ReturnsFalse_WhenStepsAreEmpty()
    {
        // Arrange
        var request = new EngineRequest(
            "key-1",
            "op-1",
            new InstanceInformation
            {
                Org = "ttd",
                App = "app",
                InstanceOwnerPartyId = 1,
                InstanceGuid = Guid.NewGuid(),
            },
            new Actor { UserIdOrOrgNumber = "user-1" },
            DateTimeOffset.UtcNow,
            null,
            []
        );

        // Act
        var result = request.IsValid();

        // Assert
        Assert.False(result);
    }
}
