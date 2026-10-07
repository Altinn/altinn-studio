using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Round-trips the <c>engine.namespace_throttles</c> state table against real Postgres, pinning
/// that the migration-created schema (varchar PK, interval window, jsonb canaries) matches the
/// EF mapping. The sweep PR adds the real repository read/write surface; this only guards the
/// schema/mapping contract.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class NamespaceThrottleTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task NamespaceThrottle_InsertAndReadBack_PreservesAllFields()
    {
        // Arrange
        var trippedAt = new DateTimeOffset(2026, 8, 13, 10, 0, 0, TimeSpan.Zero);
        var throttle = new NamespaceThrottle
        {
            Namespace = "ttd/broken-app",
            State = NamespaceThrottleState.Tripped,
            TrippedAt = trippedAt,
            CurrentWindow = TimeSpan.FromMinutes(20),
            Canaries = [new ThrottleCanary(Guid.NewGuid(), 7), new ThrottleCanary(Guid.NewGuid(), 3)],
            LastEvaluatedAt = trippedAt.AddMinutes(5),
            LastRequeuedCount = 120,
            LastActiveCount = 150,
            UpdatedAt = trippedAt.AddMinutes(5),
        };

        await using (var writeContext = fixture.CreateDbContext())
        {
            writeContext.NamespaceThrottles.Add(NamespaceThrottleEntity.FromDomainModel(throttle));
            await writeContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        // Act
        await using var readContext = fixture.CreateDbContext();
        var entity = await readContext
            .NamespaceThrottles.AsNoTracking()
            .SingleAsync(t => t.Namespace == throttle.Namespace, TestContext.Current.CancellationToken);
        var roundTripped = entity.ToDomainModel();

        // Assert
        Assert.Equal(throttle.Namespace, roundTripped.Namespace);
        Assert.Equal(throttle.State, roundTripped.State);
        Assert.Equal(throttle.TrippedAt, roundTripped.TrippedAt);
        Assert.Equal(throttle.CurrentWindow, roundTripped.CurrentWindow);
        Assert.Equal(throttle.Canaries, roundTripped.Canaries);
        Assert.Equal(throttle.LastEvaluatedAt, roundTripped.LastEvaluatedAt);
        Assert.Equal(throttle.LastRequeuedCount, roundTripped.LastRequeuedCount);
        Assert.Equal(throttle.LastActiveCount, roundTripped.LastActiveCount);
        Assert.Equal(throttle.UpdatedAt, roundTripped.UpdatedAt);
    }
}
