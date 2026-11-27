using Microsoft.Extensions.Time.Testing;
using Npgsql;
using NpgsqlTypes;
using WorkflowEngine.Data;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class WorkflowCountTests(PostgresFixture fixture) : IAsyncLifetime
{
    private static readonly DateTimeOffset _now = new(2026, 11, 26, 12, 0, 0, TimeSpan.Zero);

    private readonly NpgsqlDataSource _dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => _dataSource.DisposeAsync();

    [Fact]
    public async Task EachIncompleteOrFailedWorkflowIsCountedOnce_WithFutureStartsSplitFromEnqueued()
    {
        await Insert("ttd/a", PersistentItemStatus.Enqueued, startAt: null);
        await Insert("ttd/a", PersistentItemStatus.Enqueued, startAt: _now);
        await Insert("ttd/a", PersistentItemStatus.Enqueued, startAt: _now.AddSeconds(1));
        await Insert("ttd/a", PersistentItemStatus.Held, startAt: null);
        await Insert("ttd/a", PersistentItemStatus.Canceled, startAt: _now.AddDays(1));
        await Insert("ttd/a", PersistentItemStatus.Failed, startAt: null);
        await Insert("ttd/a", PersistentItemStatus.Completed, startAt: null);
        await Insert("ttd/b", PersistentItemStatus.Enqueued, startAt: _now.AddHours(1));
        await Insert("ttd/b", PersistentItemStatus.Enqueued, startAt: _now.AddHours(2));
        await Insert("ttd/b", PersistentItemStatus.DependencyFailed, startAt: null);
        await Insert("ttd/b", PersistentItemStatus.Abandoned, startAt: null);

        var counts = await fixture
            .CreateRepository(new FakeTimeProvider(_now))
            .CountIncompleteAndFailedWorkflowsByNamespace(TestContext.Current.CancellationToken);

        NamespaceStatusCount[] expected =
        [
            new("ttd/a", PersistentItemStatus.Enqueued, Scheduled: false, 2),
            new("ttd/a", PersistentItemStatus.Enqueued, Scheduled: true, 1),
            new("ttd/a", PersistentItemStatus.Held, Scheduled: false, 1),
            new("ttd/a", PersistentItemStatus.Failed, Scheduled: false, 1),
            new("ttd/a", PersistentItemStatus.Canceled, Scheduled: false, 1),
            new("ttd/b", PersistentItemStatus.Enqueued, Scheduled: true, 2),
            new("ttd/b", PersistentItemStatus.DependencyFailed, Scheduled: false, 1),
        ];
        Assert.Equal(Ordered(expected), Ordered(counts));
    }

    private static IEnumerable<NamespaceStatusCount> Ordered(IEnumerable<NamespaceStatusCount> counts) =>
        counts.OrderBy(c => c.Namespace, StringComparer.Ordinal).ThenBy(c => c.Status).ThenBy(c => c.Scheduled);

    private async Task Insert(string ns, PersistentItemStatus status, DateTimeOffset? startAt)
    {
        await using var cmd = _dataSource.CreateCommand(
            """
            INSERT INTO engine.workflows
                (id, operation_id, idempotency_key, namespace, status, created_at, updated_at, start_at, reclaim_count)
            VALUES (gen_random_uuid(), 'test-op', gen_random_uuid()::text, @ns, @status, @created, @created, @startAt, 0)
            """
        );
        cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
        cmd.Parameters.Add(new NpgsqlParameter<int>("status", (int)status));
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("created", _now.AddDays(-1)));
        cmd.Parameters.Add(
            new NpgsqlParameter("startAt", NpgsqlDbType.TimestampTz) { Value = startAt is { } at ? at : DBNull.Value }
        );
        await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
    }
}
