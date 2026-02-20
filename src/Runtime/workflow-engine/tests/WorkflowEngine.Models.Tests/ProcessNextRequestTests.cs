namespace WorkflowEngine.Models.Tests;

public class ProcessNextRequestTests
{
    [Fact]
    public void ToEngineRequest_MapsAllFieldsCorrectly()
    {
        // Arrange
        var actor = new Actor { UserIdOrOrgNumber = "user-1", Language = "nb" };
        var instanceGuid = Guid.NewGuid();
        var instanceInfo = new InstanceInformation
        {
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = instanceGuid,
        };
        var steps = new[] { new StepRequest { Command = new Command.Debug.Noop() } };
        var createdAt = DateTimeOffset.UtcNow;
        var startAt = createdAt.AddMinutes(5);
        var traceContext = "trace-123";

        var request = new ProcessNextRequest
        {
            CurrentElementId = "Task_1",
            DesiredElementId = "Task_2",
            Actor = actor,
            LockToken = "lock-abc",
            StartAt = startAt,
            Steps = steps,
        };

        // Act
        var engineRequest = request.ToEngineRequest(instanceInfo, createdAt, traceContext);

        // Assert
        Assert.Equal("next", engineRequest.OperationId);
        Assert.Same(instanceInfo, engineRequest.InstanceInformation);
        Assert.Same(actor, engineRequest.Actor);
        Assert.Equal(createdAt, engineRequest.CreatedAt);
        Assert.Equal(startAt, engineRequest.StartAt);
        Assert.Same(steps, engineRequest.Steps);
        Assert.Equal(traceContext, engineRequest.TraceContext);
        Assert.Equal("lock-abc", engineRequest.InstanceLockKey);
        Assert.Equal(WorkflowType.AppProcessChange, engineRequest.Type);
    }

    [Fact]
    public void ToEngineRequest_DefaultValues_AreCorrect()
    {
        // Arrange
        var request = new ProcessNextRequest
        {
            CurrentElementId = "Task_1",
            DesiredElementId = "Task_2",
            Actor = new Actor { UserIdOrOrgNumber = "user-1" },
            LockToken = "lock-1",
            Steps = [],
        };
        var instanceInfo = new InstanceInformation
        {
            Org = "ttd",
            App = "app",
            InstanceOwnerPartyId = 1,
            InstanceGuid = Guid.NewGuid(),
        };

        // Act
        var engineRequest = request.ToEngineRequest(instanceInfo, DateTimeOffset.UtcNow, null);

        // Assert
        Assert.Equal(WorkflowType.AppProcessChange, engineRequest.Type);
        Assert.Null(engineRequest.Dependencies);
    }
}
