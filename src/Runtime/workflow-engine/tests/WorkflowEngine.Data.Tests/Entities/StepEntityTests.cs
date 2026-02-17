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
            Id = 99,
            IdempotencyKey = "step-key-1",
            OperationId = "send-email",
            Status = PersistentItemStatus.Processing,
            ProcessingOrder = 3,
            CreatedAt = new DateTimeOffset(2025, 6, 15, 10, 30, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2025, 6, 15, 11, 0, 0, TimeSpan.Zero),
            BackoffUntil = new DateTimeOffset(2025, 6, 15, 10, 31, 0, TimeSpan.Zero),
            RequeueCount = 2,
            ActorUserIdOrOrgNumber = "org-456",
            ActorLanguage = "en",
            CommandJson = commandJson ?? """{"type":"app","commandKey":"sign","payload":"{\"data\":1}"}""",
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
        Assert.Equal(entity.IdempotencyKey, roundTripped.IdempotencyKey);
        Assert.Equal(entity.OperationId, roundTripped.OperationId);
        Assert.Equal(entity.Status, roundTripped.Status);
        Assert.Equal(entity.ProcessingOrder, roundTripped.ProcessingOrder);
        Assert.Equal(entity.CreatedAt, roundTripped.CreatedAt);
        Assert.Equal(entity.UpdatedAt, roundTripped.UpdatedAt);
        Assert.Equal(entity.BackoffUntil, roundTripped.BackoffUntil);
        Assert.Equal(entity.RequeueCount, roundTripped.RequeueCount);
        Assert.Equal(entity.ActorUserIdOrOrgNumber, roundTripped.ActorUserIdOrOrgNumber);
        Assert.Equal(entity.ActorLanguage, roundTripped.ActorLanguage);
    }

    [Fact]
    public void Command_JsonSerialization_RoundTrip()
    {
        // Arrange
        var entity = CreateEntity(
            commandJson: """{"type":"app","commandKey":"payment","payload":"{\"amount\":100}"}"""
        );

        // Act
        var domain = entity.ToDomainModel();
        var roundTripped = StepEntity.FromDomainModel(domain);

        // Assert — verify the domain model parsed the command correctly
        var appCommand = Assert.IsType<Command.AppCommand>(domain.Command);
        Assert.Equal("payment", appCommand.CommandKey);
        Assert.Equal("{\"amount\":100}", appCommand.Payload);

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
