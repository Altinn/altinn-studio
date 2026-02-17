using WorkflowEngine.Api.Tests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Tests;

public class WorkflowConcurrencyResolverTests
{
    private readonly WorkflowConcurrencyResolver _resolver = new();

    private static InstanceInformation _instance1 =>
        new()
        {
            Org = "ttd",
            App = "app-1",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
        };

    private static InstanceInformation _instance2 =>
        new()
        {
            Org = "ttd",
            App = "app-2",
            InstanceOwnerPartyId = 67890,
            InstanceGuid = Guid.Parse("11111111-2222-3333-4444-555555555555"),
        };

    private static Workflow CreateWorkflow(WorkflowType type, InstanceInformation instance) =>
        new()
        {
            IdempotencyKey = Guid.NewGuid().ToString(),
            OperationId = "test",
            Actor = new Actor { UserIdOrOrgNumber = "user-1" },
            InstanceInformation = instance,
            Type = type,
            Steps = [],
        };

    [Fact]
    public void CanAccept_EmptyInbox_AlwaysAllows()
    {
        // Arrange
        var existingWorkflows = Enumerable.Empty<Workflow>();

        // Act & Assert
        Assert.True(_resolver.CanAccept(WorkflowType.AppProcessChange, _instance1, existingWorkflows));
        Assert.True(_resolver.CanAccept(WorkflowType.Generic, _instance1, existingWorkflows));
    }

    [Fact]
    public void CanAccept_AppProcessChange_RejectsWhenOneExists()
    {
        // Arrange
        var existing = new[] { CreateWorkflow(WorkflowType.AppProcessChange, _instance1) };

        // Act
        var result = _resolver.CanAccept(WorkflowType.AppProcessChange, _instance1, existing);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void CanAccept_AppProcessChange_AllowsForDifferentInstance()
    {
        // Arrange
        var existing = new[] { CreateWorkflow(WorkflowType.AppProcessChange, _instance1) };

        // Act
        var result = _resolver.CanAccept(WorkflowType.AppProcessChange, _instance2, existing);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void CanAccept_Generic_AllowsUnlimited()
    {
        // Arrange
        var existing = Enumerable.Range(0, 100).Select(_ => CreateWorkflow(WorkflowType.Generic, _instance1)).ToList();

        // Act
        var result = _resolver.CanAccept(WorkflowType.Generic, _instance1, existing);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void CanAccept_AppProcessChange_AllowsWhenExistingIsDifferentType()
    {
        // Arrange — instance has a Generic workflow, but no AppProcessChange
        var existing = new[] { CreateWorkflow(WorkflowType.Generic, _instance1) };

        // Act
        var result = _resolver.CanAccept(WorkflowType.AppProcessChange, _instance1, existing);

        // Assert
        Assert.True(result);
    }
}
