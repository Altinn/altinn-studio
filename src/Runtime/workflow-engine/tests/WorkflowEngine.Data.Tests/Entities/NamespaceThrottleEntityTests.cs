using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Tests.Entities;

public class NamespaceThrottleEntityTests
{
    private static NamespaceThrottleEntity CreateEntity() =>
        new()
        {
            Namespace = "ttd/broken-app",
            State = NamespaceThrottleState.Tripped,
            TrippedAt = new DateTimeOffset(2026, 8, 13, 10, 0, 0, TimeSpan.Zero),
            CurrentWindow = TimeSpan.FromMinutes(20),
            Canaries =
            [
                new ThrottleCanary(Guid.Parse("11111111-2222-3333-4444-555555555555"), 7),
                new ThrottleCanary(Guid.Parse("66666666-7777-8888-9999-aaaaaaaaaaaa"), 3),
            ],
            LastEvaluatedAt = new DateTimeOffset(2026, 8, 13, 10, 5, 0, TimeSpan.Zero),
            LastRequeuedCount = 120,
            LastActiveCount = 150,
            UpdatedAt = new DateTimeOffset(2026, 8, 13, 10, 5, 0, TimeSpan.Zero),
        };

    [Fact]
    public void ToDomainModel_FromDomainModel_RoundTrip_PreservesAllFields()
    {
        // Arrange
        var entity = CreateEntity();

        // Act
        var domain = entity.ToDomainModel();
        var roundTripped = NamespaceThrottleEntity.FromDomainModel(domain);

        // Assert
        Assert.Equal(entity.Namespace, roundTripped.Namespace);
        Assert.Equal(entity.State, roundTripped.State);
        Assert.Equal(entity.TrippedAt, roundTripped.TrippedAt);
        Assert.Equal(entity.CurrentWindow, roundTripped.CurrentWindow);
        Assert.Equal(entity.Canaries, roundTripped.Canaries);
        Assert.Equal(entity.LastEvaluatedAt, roundTripped.LastEvaluatedAt);
        Assert.Equal(entity.LastRequeuedCount, roundTripped.LastRequeuedCount);
        Assert.Equal(entity.LastActiveCount, roundTripped.LastActiveCount);
        Assert.Equal(entity.UpdatedAt, roundTripped.UpdatedAt);
    }

    [Fact]
    public void ToDomainModel_NullCanaries_MapsToEmptyList()
    {
        // Arrange
        var entity = CreateEntity();
        entity.Canaries = null;

        // Act
        var domain = entity.ToDomainModel();

        // Assert
        Assert.NotNull(domain.Canaries);
        Assert.Empty(domain.Canaries);
    }

    [Fact]
    public void FromDomainModel_EmptyCanaries_MapsToNull()
    {
        // Arrange
        var domain = CreateEntity().ToDomainModel() with
        {
            Canaries = [],
        };

        // Act
        var entity = NamespaceThrottleEntity.FromDomainModel(domain);

        // Assert
        Assert.Null(entity.Canaries);
    }
}
