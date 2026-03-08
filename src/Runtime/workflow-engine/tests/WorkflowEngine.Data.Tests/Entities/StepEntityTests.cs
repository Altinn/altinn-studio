using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Data.Tests.Entities;

public class StepEntityTests
{
    private static StepEntity CreateEntity(
        string? commandJson = null,
        string? retryStrategyJson = null,
        bool includeRetryStrategy = true
    ) =>
        new()
        {
            Id = Guid.Parse("99999999-aaaa-bbbb-cccc-dddddddddddd"),
            OperationId = "send-email",
            IdempotencyKey = "step-key",
            Status = PersistentItemStatus.Processing,
            ProcessingOrder = 3,
            CreatedAt = new DateTimeOffset(2025, 6, 15, 10, 30, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2025, 6, 15, 11, 0, 0, TimeSpan.Zero),
            BackoffUntil = new DateTimeOffset(2025, 6, 15, 10, 31, 0, TimeSpan.Zero),
            RequeueCount = 2,
            CommandJson = commandJson ?? """{"type":"app","operationId":"sign","data":{"value":1}}""",
            RetryStrategyJson = includeRetryStrategy
                ? (retryStrategyJson ?? """{"backoffType":"Exponential","baseInterval":"00:00:05","maxRetries":3}""")
                : null,
        };

    [Fact]
    public void ToDomainModel_FromDomainModel_RoundTrip_PreservesAllFields()
    {
        // Arrange
        var entity = CreateEntity();

        // Act
        var domain = entity.ToDomainModel();
        var roundTripped = StepEntity.FromDomainModel(domain);

        // Assert
        Assert.Equal(entity.Id, roundTripped.Id);
        Assert.Equal(entity.OperationId, roundTripped.OperationId);
        Assert.Equal(entity.Status, roundTripped.Status);
        Assert.Equal(entity.ProcessingOrder, roundTripped.ProcessingOrder);
        Assert.Equal(entity.CreatedAt, roundTripped.CreatedAt);
        Assert.Equal(entity.UpdatedAt, roundTripped.UpdatedAt);
        Assert.Equal(entity.BackoffUntil, roundTripped.BackoffUntil);
        Assert.Equal(entity.RequeueCount, roundTripped.RequeueCount);
    }

    [Fact]
    public void Command_JsonSerialization_RoundTrip()
    {
        // Arrange
        var entity = CreateEntity(commandJson: """{"type":"app","operationId":"payment","data":{"amount":100}}""");

        // Act
        var domain = entity.ToDomainModel();
        var roundTripped = StepEntity.FromDomainModel(domain);

        // Assert — verify the domain model parsed the command correctly
        Assert.Equal("app", domain.Command.Type);
        Assert.Equal("payment", domain.Command.OperationId);
        Assert.NotNull(domain.Command.Data);

        // Verify the round-tripped entity serialized it back to valid JSON
        Assert.NotNull(roundTripped.CommandJson);
        Assert.Contains("payment", roundTripped.CommandJson, StringComparison.Ordinal);
    }

    [Fact]
    public void RetryStrategy_JsonSerialization_RoundTrip_WithStrategy()
    {
        // Arrange
        var entity = CreateEntity();

        // Act
        var domain = entity.ToDomainModel();

        // Assert
        Assert.NotNull(domain.RetryStrategy);
        Assert.Equal(BackoffType.Exponential, domain.RetryStrategy.BackoffType);
        Assert.Equal(TimeSpan.FromSeconds(5), domain.RetryStrategy.BaseInterval);
        Assert.Equal(3, domain.RetryStrategy.MaxRetries);

        // Verify round-trip
        var roundTripped = StepEntity.FromDomainModel(domain);
        Assert.NotNull(roundTripped.RetryStrategyJson);
    }

    [Fact]
    public void RetryStrategy_JsonSerialization_HandlesNull()
    {
        // Arrange
        var entity = CreateEntity(includeRetryStrategy: false);

        // Act
        var domain = entity.ToDomainModel();

        // Assert
        Assert.Null(domain.RetryStrategy);

        // Verify round-trip
        var roundTripped = StepEntity.FromDomainModel(domain);
        Assert.Null(roundTripped.RetryStrategyJson);
    }
}
