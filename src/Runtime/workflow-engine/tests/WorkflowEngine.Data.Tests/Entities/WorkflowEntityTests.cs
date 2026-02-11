using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Tests.Entities;

public class WorkflowEntityTests
{
    private static WorkflowEntity CreateWorkflowEntity(params StepEntity[] steps) =>
        new()
        {
            Id = 42,
            IdempotencyKey = "workflow-key-1",
            InstanceLockKey = "lock-key-1",
            OperationId = "next",
            CreatedAt = new DateTimeOffset(2025, 6, 15, 10, 30, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2025, 6, 15, 10, 35, 0, TimeSpan.Zero),
            Status = PersistentItemStatus.Processing,
            ActorUserIdOrOrgNumber = "user-123",
            ActorLanguage = "nb",
            InstanceOrg = "ttd",
            InstanceApp = "test-app",
            InstanceOwnerPartyId = 50001,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            TraceContext = "trace-ctx-abc",
            Steps = steps.ToList(),
        };

    private static StepEntity CreateStepEntity(int order = 0) =>
        new()
        {
            Id = 100 + order,
            IdempotencyKey = $"step-key-{order}",
            OperationId = "noop",
            Status = PersistentItemStatus.Enqueued,
            ProcessingOrder = order,
            CreatedAt = new DateTimeOffset(2025, 6, 15, 10, 30, 0, TimeSpan.Zero),
            ActorUserIdOrOrgNumber = "user-123",
            ActorLanguage = "nb",
            CommandJson = """{"type":"app","commandKey":"noop"}""",
        };

    [Fact]
    public void ToDomainModel_FromDomainModel_RoundTrip_PreservesAllFields()
    {
        // Arrange
        var entity = CreateWorkflowEntity(CreateStepEntity(0), CreateStepEntity(1));

        // Act
        var domain = entity.ToDomainModel();
        var roundTripped = WorkflowEntity.FromDomainModel(domain);

        // Assert
        Assert.Equal(entity.Id, roundTripped.Id);
        Assert.Equal(entity.IdempotencyKey, roundTripped.IdempotencyKey);
        Assert.Equal(entity.InstanceLockKey, roundTripped.InstanceLockKey);
        Assert.Equal(entity.OperationId, roundTripped.OperationId);
        Assert.Equal(entity.CreatedAt, roundTripped.CreatedAt);
        Assert.Equal(entity.UpdatedAt, roundTripped.UpdatedAt);
        Assert.Equal(entity.Status, roundTripped.Status);
        Assert.Equal(entity.TraceContext, roundTripped.TraceContext);
        Assert.Equal(entity.ActorUserIdOrOrgNumber, roundTripped.ActorUserIdOrOrgNumber);
        Assert.Equal(entity.ActorLanguage, roundTripped.ActorLanguage);
        Assert.Equal(entity.InstanceOrg, roundTripped.InstanceOrg);
        Assert.Equal(entity.InstanceApp, roundTripped.InstanceApp);
        Assert.Equal(entity.InstanceOwnerPartyId, roundTripped.InstanceOwnerPartyId);
        Assert.Equal(entity.InstanceGuid, roundTripped.InstanceGuid);
        Assert.Equal(entity.Steps.Count, roundTripped.Steps.Count);
    }

    [Fact]
    public void ToDomainModel_MapsActorAndInstanceFieldsCorrectly()
    {
        // Arrange
        var entity = CreateWorkflowEntity();

        // Act
        var domain = entity.ToDomainModel();

        // Assert
        Assert.Equal("user-123", domain.Actor.UserIdOrOrgNumber);
        Assert.Equal("nb", domain.Actor.Language);
        Assert.Equal("ttd", domain.InstanceInformation.Org);
        Assert.Equal("test-app", domain.InstanceInformation.App);
        Assert.Equal(50001, domain.InstanceInformation.InstanceOwnerPartyId);
        Assert.Equal(Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"), domain.InstanceInformation.InstanceGuid);
    }

    [Fact]
    public void Steps_AreOrdered_ByProcessingOrder()
    {
        // Arrange — steps added in reverse order
        var entity = CreateWorkflowEntity(CreateStepEntity(2), CreateStepEntity(0), CreateStepEntity(1));

        // Act
        var domain = entity.ToDomainModel();

        // Assert
        Assert.Equal(0, domain.Steps[0].ProcessingOrder);
        Assert.Equal(1, domain.Steps[1].ProcessingOrder);
        Assert.Equal(2, domain.Steps[2].ProcessingOrder);
    }
}
