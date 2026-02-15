using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class WorkflowExtensionsTests
{
    private static Actor _defaultActor => new() { UserIdOrOrgNumber = "user-1" };

    private static InstanceInformation _defaultInstance =>
        new()
        {
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.NewGuid(),
        };

    private static Step CreateStep(PersistentItemStatus status, int order = 0) =>
        new()
        {
            IdempotencyKey = $"key-{order}",
            OperationId = "op",
            Actor = _defaultActor,
            ProcessingOrder = order,
            Command = new Command.Debug.Noop(),
            Status = status,
        };

    private static Workflow CreateWorkflow(params Step[] steps) =>
        new()
        {
            IdempotencyKey = "workflow-key",
            OperationId = "test-op",
            Actor = _defaultActor,
            InstanceInformation = _defaultInstance,
            Steps = steps.ToList(),
        };

    [Fact]
    public void OverallStatus_ReturnsCompleted_WhenAllStepsCompleted()
    {
        // Arrange
        var workflow = CreateWorkflow(
            CreateStep(PersistentItemStatus.Completed, 0),
            CreateStep(PersistentItemStatus.Completed, 1)
        );

        // Act
        var result = workflow.OverallStatus();

        // Assert
        Assert.Equal(PersistentItemStatus.Completed, result);
    }

    [Fact]
    public void OverallStatus_ReturnsFailed_WhenAnyStepFailed()
    {
        // Arrange
        var workflow = CreateWorkflow(
            CreateStep(PersistentItemStatus.Completed, 0),
            CreateStep(PersistentItemStatus.Failed, 1)
        );

        // Act
        var result = workflow.OverallStatus();

        // Assert
        Assert.Equal(PersistentItemStatus.Failed, result);
    }

    [Fact]
    public void OverallStatus_ReturnsCanceled_WhenAnyStepCanceled()
    {
        // Arrange
        var workflow = CreateWorkflow(
            CreateStep(PersistentItemStatus.Completed, 0),
            CreateStep(PersistentItemStatus.Canceled, 1)
        );

        // Act
        var result = workflow.OverallStatus();

        // Assert
        Assert.Equal(PersistentItemStatus.Canceled, result);
    }

    [Fact]
    public void OverallStatus_ReturnsProcessing_WhenMixedActiveStatuses()
    {
        // Arrange
        var workflow = CreateWorkflow(
            CreateStep(PersistentItemStatus.Completed, 0),
            CreateStep(PersistentItemStatus.Processing, 1),
            CreateStep(PersistentItemStatus.Enqueued, 2)
        );

        // Act
        var result = workflow.OverallStatus();

        // Assert
        Assert.Equal(PersistentItemStatus.Processing, result);
    }

    [Fact]
    public void OverallStatus_ReturnsEnqueued_WhenAllStepsEnqueued()
    {
        // Arrange
        var workflow = CreateWorkflow(
            CreateStep(PersistentItemStatus.Enqueued, 0),
            CreateStep(PersistentItemStatus.Enqueued, 1)
        );

        // Act
        var result = workflow.OverallStatus();

        // Assert
        Assert.Equal(PersistentItemStatus.Enqueued, result);
    }

    [Fact]
    public void OrderedSteps_ReturnsSortedByProcessingOrder()
    {
        // Arrange
        var workflow = CreateWorkflow(
            CreateStep(PersistentItemStatus.Enqueued, 3),
            CreateStep(PersistentItemStatus.Enqueued, 1),
            CreateStep(PersistentItemStatus.Enqueued, 2)
        );

        // Act
        var orderedSteps = workflow.OrderedSteps().ToList();

        // Assert
        Assert.Equal(1, orderedSteps[0].ProcessingOrder);
        Assert.Equal(2, orderedSteps[1].ProcessingOrder);
        Assert.Equal(3, orderedSteps[2].ProcessingOrder);
    }
}
