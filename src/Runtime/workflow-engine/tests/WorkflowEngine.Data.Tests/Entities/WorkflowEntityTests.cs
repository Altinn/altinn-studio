using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Tests.Entities;

public class WorkflowEntityTests
{
    private static WorkflowEntity CreateWorkflowEntity(params StepEntity[] steps) =>
        new()
        {
            Id = Guid.Parse("11111111-2222-3333-4444-555555555555"),
            IdempotencyKey = "wf-key",
            TenantId = "test-tenant",
            OperationId = "next",
            CreatedAt = new DateTimeOffset(2025, 6, 15, 10, 30, 0, TimeSpan.Zero),
            StartAt = new DateTimeOffset(2025, 6, 15, 12, 0, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2025, 6, 15, 10, 35, 0, TimeSpan.Zero),
            Status = PersistentItemStatus.Processing,
            LabelsJson = """{"env":"test"}""",
            ContextJson = """{"key":"value"}""",
            TraceContext = "trace-ctx-abc",
            Steps = steps.ToList(),
        };

    private static StepEntity CreateStepEntity(int order = 0) =>
        new()
        {
            Id = Guid.NewGuid(),
            OperationId = "noop",
            IdempotencyKey = $"step-key-{order}",
            Status = PersistentItemStatus.Enqueued,
            ProcessingOrder = order,
            CreatedAt = new DateTimeOffset(2025, 6, 15, 10, 30, 0, TimeSpan.Zero),
            CommandJson = """{"type":"app","operationId":"noop"}""",
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
        Assert.Equal(entity.TenantId, roundTripped.TenantId);
        Assert.Equal(entity.OperationId, roundTripped.OperationId);
        Assert.Equal(entity.CreatedAt, roundTripped.CreatedAt);
        Assert.Equal(entity.StartAt, roundTripped.StartAt);
        Assert.Equal(entity.UpdatedAt, roundTripped.UpdatedAt);
        Assert.Equal(entity.Status, roundTripped.Status);
        Assert.Equal(entity.TraceContext, roundTripped.TraceContext);
        Assert.Equal(entity.Steps.Count, roundTripped.Steps.Count);
    }

    [Fact]
    public void ToDomainModel_MapsTenantIdAndLabelsCorrectly()
    {
        // Arrange
        var entity = CreateWorkflowEntity();

        // Act
        var domain = entity.ToDomainModel();

        // Assert
        Assert.Equal("test-tenant", domain.TenantId);
        Assert.NotNull(domain.Labels);
        Assert.Equal("test", domain.Labels["env"]);
        Assert.NotNull(domain.Context);
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
