using System.Data.Common;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Npgsql;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Covers the <c>collection_changed</c> notifications each write sends and the batched read that answers them, on a
/// connection of the test's own, as another replica would listen.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class CollectionNotificationTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "notify-ns";

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task GetCollectionDetails_ReturnsWhatGetCollectionReturns_ForEachRequestedCollection()
    {
        // Arrange
        var repo = fixture.CreateRepository(new FakeTimeProvider(DateTimeOffset.UtcNow));
        await Enqueue(repo, "ns-a", "k1", [Request("first"), Request("second")]);
        await Enqueue(repo, "ns-b", "k2", [Request("only")]);
        await Enqueue(repo, "ns-a", "k2", [Request("not-requested")]);
        CollectionId[] requested = [new("ns-a", "k1"), new("ns-b", "k2"), new("ns-c", "absent")];

        // Act
        var details = await repo.GetCollectionDetails(
            requested,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(
            [new("ns-a", "k1"), new CollectionId("ns-b", "k2")],
            details.Keys.OrderBy(c => c.Namespace, StringComparer.Ordinal)
        );
        foreach (var (collection, detail) in details)
        {
            var single = await repo.GetCollection(
                collection.Key,
                collection.Namespace,
                TestContext.Current.CancellationToken
            );
            Assert.Equal(JsonSerializer.Serialize(single), JsonSerializer.Serialize(detail));
        }
        Assert.Equal(2, details[new("ns-a", "k1")].Heads.Count);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CollectionRead_WhenAHeadIsReplacedAndCompletesDuringTheRead_ShowsTheHeadsOfOneMoment(bool batched)
    {
        // Arrange: after the heads are read and before their statuses are, a continuation replaces the running head
        // and the head completes
        var replaced = await EnqueueWithStatus(fixture.CreateRepository(), "k1", PersistentItemStatus.Processing);
        var interceptor = new BeforeHeadStatusesRead(async () =>
        {
            await Enqueue(fixture.CreateRepository(), Ns, "k1", [Request("continuation")]);
            await using var context = fixture.CreateDbContext();
            await context.Database.ExecuteSqlAsync(
                $"UPDATE engine.workflows SET status = {(int)PersistentItemStatus.Completed} WHERE id = {replaced.DatabaseId}",
                TestContext.Current.CancellationToken
            );
        });
        var repo = fixture.CreateRepositoryWithInterceptor(interceptor);
        var collection = new CollectionId(Ns, "k1");

        // Act
        var detail = batched
            ? (await repo.GetCollectionDetails([collection], TestContext.Current.CancellationToken))[collection]
            : await repo.GetCollection(collection.Key, collection.Namespace, TestContext.Current.CancellationToken);

        // Assert
        Assert.True(interceptor.Changed.IsCompletedSuccessfully);
        var head = Assert.Single(detail!.Heads);
        Assert.Equal(replaced.DatabaseId, head.DatabaseId);
        Assert.Equal(PersistentItemStatus.Processing, head.Status);
    }

    [Fact]
    public async Task Enqueue_SendsNoCollectionNotification()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        await using var listener = await Listener.Start(fixture.ConnectionString);

        // Act
        await repo.BatchEnqueueWorkflows(
            [Buffered("k1", [Request("in-collection")])],
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Empty(await listener.Drain());
    }

    [Fact]
    public async Task WriteBack_NotifiesTheCollectionsOfTheAcceptedWorkflowsOnly()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var accepted = await EnqueueWithStatus(repo, "k-accepted", PersistentItemStatus.Processing);
        var leaseLost = await EnqueueWithStatus(repo, "k-lease-lost", PersistentItemStatus.Processing);
        leaseLost.LeaseToken = Guid.NewGuid();
        accepted.Status = PersistentItemStatus.Completed;
        leaseLost.Status = PersistentItemStatus.Completed;
        await using var listener = await Listener.Start(fixture.ConnectionString);

        // Act
        await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(accepted, []), new BatchWorkflowStatusUpdate(leaseLost, [])],
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal([new CollectionId(Ns, "k-accepted")], await listener.Drain());
    }

    [Theory]
    [InlineData(PersistentItemStatus.Processing, false)]
    [InlineData(PersistentItemStatus.Completed, true)]
    public async Task WriteBack_NotifiesTheCollectionOnlyWhenTheWorkflowLeavesProcessing(
        PersistentItemStatus written,
        bool collectionNotified
    )
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var workflow = await EnqueueWithStatus(repo, "k1", PersistentItemStatus.Processing);
        workflow.Status = written;
        await using var listener = await Listener.Start(fixture.ConnectionString);

        // Act
        await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(workflow, [])],
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(collectionNotified ? [new CollectionId(Ns, "k1")] : [], await listener.Drain());
        Assert.Equal(1, listener.StatusChanges);
    }

    [Fact]
    public async Task Resume_NotifiesTheCollectionOfEveryResumedWorkflow_CascadedOnesIncluded()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var failed = await EnqueueWithStatus(repo, "k-failed", PersistentItemStatus.Failed);
        await EnqueueWithStatus(
            repo,
            "k-dependent",
            PersistentItemStatus.DependencyFailed,
            dependsOn: failed.DatabaseId
        );
        await using var listener = await Listener.Start(fixture.ConnectionString);

        // Act
        await repo.ResumeWorkflow(
            failed.DatabaseId,
            Ns,
            DateTimeOffset.UtcNow,
            cascade: true,
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(
            [new CollectionId(Ns, "k-dependent"), new CollectionId(Ns, "k-failed")],
            (await listener.Drain()).OrderBy(c => c.Key, StringComparer.Ordinal)
        );
    }

    [Fact]
    public async Task Fail_NotifiesTheFailedWorkflowsCollection()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var parked = await EnqueueWithStatus(repo, "k1", PersistentItemStatus.Requeued);
        await using var listener = await Listener.Start(fixture.ConnectionString);

        // Act
        await repo.FailWorkflow(
            parked.DatabaseId,
            Ns,
            DateTimeOffset.UtcNow,
            "Failed by the test",
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal([new CollectionId(Ns, "k1")], await listener.Drain());
    }

    [Fact]
    public async Task Abandon_NotifiesTheAbandonedWorkflowsCollection()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var failed = await EnqueueWithStatus(repo, "k1", PersistentItemStatus.Failed);
        await using var listener = await Listener.Start(fixture.ConnectionString);

        // Act
        await repo.AbandonWorkflow(failed.DatabaseId, Ns, DateTimeOffset.UtcNow, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal([new CollectionId(Ns, "k1")], await listener.Drain());
    }

    [Fact]
    public async Task Delivery_ThatWakesAReceiver_NotifiesTheReceiversCollection()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var mailbox = await MintMailbox(repo);
        await Enqueue(repo, Ns, "k-receiver", [ReceiverRequest(mailbox.Id)]);
        await using var listener = await Listener.Start(fixture.ConnectionString);

        // Act
        await repo.DeliverToMailbox(
            mailbox.Id,
            Ns,
            "msg-1",
            payload: "{}",
            DateTimeOffset.UtcNow,
            maxLogLength: 100,
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal([new CollectionId(Ns, "k-receiver")], await listener.Drain());
    }

    [Fact]
    public async Task Close_ThatReleasesReceivers_NotifiesTheirCollections()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var mailbox = await MintMailbox(repo);
        await Enqueue(repo, Ns, "k-receiver", [ReceiverRequest(mailbox.Id)]);
        await using var listener = await Listener.Start(fixture.ConnectionString);

        // Act
        await repo.CloseMailbox(
            mailbox.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal([new CollectionId(Ns, "k-receiver")], await listener.Drain());
    }

    [Fact]
    public async Task NotifyChanged_InATransactionThatRollsBack_DeliversNothing()
    {
        // Arrange
        await using var listener = await Listener.Start(fixture.ConnectionString);
        await using var conn = new NpgsqlConnection(fixture.ConnectionString);
        await conn.OpenAsync(TestContext.Current.CancellationToken);
        await using var tx = await conn.BeginTransactionAsync(TestContext.Current.CancellationToken);

        // Act
        await EngineRepository.NotifyChanged(
            conn,
            tx,
            [new CollectionId(Ns, "k1")],
            TestContext.Current.CancellationToken
        );
        await tx.RollbackAsync(TestContext.Current.CancellationToken);

        // Assert
        Assert.Empty(await listener.Drain());
    }

    [Fact]
    public async Task Fail_InTheLongestCollectionTheEngineAccepts_StillNotifies()
    {
        // Arrange: astral characters, which the payload escapes to 12 bytes each. The namespace's limit counts
        // UTF-16 code units, two per astral character, and the key column's counts characters.
        var repo = fixture.CreateRepository();
        var ns = string.Concat(Enumerable.Repeat("😀", 100));
        var key = string.Concat(Enumerable.Repeat("😀", 200));
        var parked = await EnqueueWithStatus(repo, key, PersistentItemStatus.Requeued, ns: ns);
        await using var listener = await Listener.Start(fixture.ConnectionString);

        // Act
        await repo.FailWorkflow(
            parked.DatabaseId,
            ns,
            DateTimeOffset.UtcNow,
            "Failed by the test",
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal([new CollectionId(ns, key)], await listener.Drain());
    }

    public enum OperatorWrite
    {
        Resume,
        Fail,
        Abandon,
    }

    [Theory]
    [InlineData(OperatorWrite.Resume, PersistentItemStatus.Failed)]
    [InlineData(OperatorWrite.Fail, PersistentItemStatus.Requeued)]
    [InlineData(OperatorWrite.Abandon, PersistentItemStatus.Failed)]
    public async Task OperatorWrite_WhoseNotificationFails_CommitsNothing(
        OperatorWrite write,
        PersistentItemStatus status
    )
    {
        // Arrange
        var workflow = await EnqueueWithStatus(fixture.CreateRepository(), "k1", status);
        var before = JsonSerializer.Serialize(await fixture.GetWorkflow(workflow.DatabaseId));
        await using var refusing = await NotificationsRefused(times: int.MaxValue);
        var repo = refusing.CreateRepository(RetryStrategy.None());

        // Act
        var refusal = await Assert.ThrowsAsync<PostgresException>(() => Run(repo, write, workflow.DatabaseId));

        // Assert
        Assert.Equal(RefusedNotifications.Message, refusal.MessageText);
        Assert.Equal(before, JsonSerializer.Serialize(await fixture.GetWorkflow(workflow.DatabaseId)));
    }

    [Fact]
    public async Task Fail_WhenAFetchClaimsTheWorkflowBeforeTheRetry_ReportsNothingFailed()
    {
        // Arrange: the first attempt's notification is refused, which rolls its failure back. The retry waits on
        // the test's clock, so it cannot run before the claim below.
        var parked = await EnqueueWithStatus(fixture.CreateRepository(), "k1", PersistentItemStatus.Requeued);
        await using var refusing = await NotificationsRefused(times: 1);
        var time = new FakeTimeProvider(DateTimeOffset.UtcNow);
        var retryDelay = TimeSpan.FromMinutes(1);
        var repo = refusing.CreateRepository(RetryStrategy.Constant(retryDelay, maxRetries: 1), time);

        // Act
        var failing = repo.FailWorkflow(
            parked.DatabaseId,
            Ns,
            DateTimeOffset.UtcNow,
            "Failed by the test",
            TestContext.Current.CancellationToken
        );
        await refusing.WaitForRefusals(1);
        await using (var context = fixture.CreateDbContext())
        {
            await context.Database.ExecuteSqlAsync(
                $"UPDATE engine.workflows SET status = {(int)PersistentItemStatus.Processing} WHERE id = {parked.DatabaseId}",
                TestContext.Current.CancellationToken
            );
        }

        // The repository may not have started the retry's delay yet, so time moves on until it has passed
        for (int i = 0; !failing.IsCompleted && i < 500; i++)
        {
            time.Advance(retryDelay);
            await Task.Delay(10, TestContext.Current.CancellationToken);
        }

        // Assert
        Assert.Null(await failing);
        Assert.Equal(PersistentItemStatus.Processing, (await fixture.GetWorkflow(parked.DatabaseId))?.Status);
    }

    private static Task Run(EngineRepository repo, OperatorWrite write, Guid workflowId) =>
        write switch
        {
            OperatorWrite.Resume => repo.ResumeWorkflow(
                workflowId,
                Ns,
                DateTimeOffset.UtcNow,
                cancellationToken: TestContext.Current.CancellationToken
            ),
            OperatorWrite.Fail => repo.FailWorkflow(
                workflowId,
                Ns,
                DateTimeOffset.UtcNow,
                "Failed by the test",
                TestContext.Current.CancellationToken
            ),
            _ => repo.AbandonWorkflow(workflowId, Ns, DateTimeOffset.UtcNow, TestContext.Current.CancellationToken),
        };

    /// <summary>
    /// Installs a <c>public.pg_notify</c> that refuses its first <paramref name="times"/> calls, and builds
    /// repositories whose connections resolve <c>pg_notify</c> to it. Other connections keep the built-in one.
    /// </summary>
    private async Task<RefusedNotifications> NotificationsRefused(int times)
    {
        await using var conn = new NpgsqlConnection(fixture.ConnectionString);
        await conn.OpenAsync(TestContext.Current.CancellationToken);
        const string install = $"""
            DROP SEQUENCE IF EXISTS public.notify_calls;
            DROP TABLE IF EXISTS public.notify_refusals;
            CREATE SEQUENCE public.notify_calls;
            CREATE TABLE public.notify_refusals (refusals int NOT NULL);
            INSERT INTO public.notify_refusals VALUES (@times);
            CREATE OR REPLACE FUNCTION public.pg_notify(channel text, payload text) RETURNS void AS $fn$
            BEGIN
                -- A sequence, unlike a row, counts the calls of transactions that roll back
                IF nextval('public.notify_calls') <= (SELECT refusals FROM public.notify_refusals) THEN
                    RAISE EXCEPTION '{RefusedNotifications.Message}';
                END IF;
                PERFORM pg_catalog.pg_notify(channel, payload);
            END
            $fn$ LANGUAGE plpgsql;
            """;
        await using var cmd = new NpgsqlCommand(install, conn);
        cmd.Parameters.Add(new NpgsqlParameter<int>("times", times));
        await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);

        var searchPublicFirst = new NpgsqlConnectionStringBuilder(fixture.ConnectionString)
        {
            SearchPath = "public,pg_catalog",
        }.ConnectionString;
        return new RefusedNotifications(fixture.Settings, searchPublicFirst);
    }

    private sealed class RefusedNotifications(EngineSettings settings, string connectionString) : IAsyncDisposable
    {
        public const string Message = "notification refused by the test";

        private readonly NpgsqlDataSource _dataSource = NpgsqlDataSource.Create(connectionString);
        private readonly ConcurrencyLimiter _limiter = new(10, 10, 1);

        public EngineRepository CreateRepository(
            RetryStrategy databaseRetryStrategy,
            TimeProvider? timeProvider = null
        ) =>
            PostgresFixture.CreateRepository(
                _dataSource,
                _limiter,
                Options.Create(settings with { DatabaseRetryStrategy = databaseRetryStrategy }),
                timeProvider
            );

        public async Task WaitForRefusals(int count)
        {
            await using var conn = await _dataSource.OpenConnectionAsync(TestContext.Current.CancellationToken);
            await using var cmd = new NpgsqlCommand(
                "SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM public.notify_calls",
                conn
            );
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            while ((long)(await cmd.ExecuteScalarAsync(cts.Token))! < count)
                await Task.Delay(10, cts.Token);
        }

        public async ValueTask DisposeAsync()
        {
            await using (var conn = await _dataSource.OpenConnectionAsync())
            await using (
                var cmd = new NpgsqlCommand(
                    "DROP FUNCTION public.pg_notify(text, text); DROP SEQUENCE public.notify_calls; DROP TABLE public.notify_refusals;",
                    conn
                )
            )
                await cmd.ExecuteNonQueryAsync();

            _limiter.Dispose();
            await _dataSource.DisposeAsync();
        }
    }

    private static WorkflowRequest Request(string @ref, IEnumerable<Guid>? dependsOn = null) =>
        new()
        {
            Ref = @ref,
            OperationId = $"op-{@ref}",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "step",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
            DependsOn = dependsOn?.Select(id => (WorkflowRef)id).ToList(),
        };

    private static WorkflowRequest ReceiverRequest(Guid mailboxId) =>
        Request("receive") with
        {
            Mailbox = new MailboxReference { Id = mailboxId },
        };

    private static BufferedEnqueueRequest Buffered(
        string? collectionKey,
        IReadOnlyList<WorkflowRequest> workflows,
        string ns = Ns
    ) =>
        new(
            new WorkflowEnqueueRequest { Workflows = workflows },
            new WorkflowRequestMetadata(ns, Guid.NewGuid().ToString("N"), collectionKey, DateTimeOffset.UtcNow, null),
            Guid.NewGuid().ToByteArray(),
            new TaskCompletionSource<WorkflowEnqueueOutcome>(TaskCreationOptions.RunContinuationsAsynchronously)
        );

    private static async Task<Guid[]> Enqueue(
        EngineRepository repo,
        string ns,
        string collectionKey,
        IReadOnlyList<WorkflowRequest> workflows
    )
    {
        var results = await repo.BatchEnqueueWorkflows(
            [Buffered(collectionKey, workflows, ns)],
            TestContext.Current.CancellationToken
        );
        return Assert.Single(results).WorkflowIds!;
    }

    /// <summary>
    /// Enqueues one workflow into <paramref name="collectionKey"/> and sets its row to <paramref name="status"/>,
    /// with a lease token as a fetched row would carry.
    /// </summary>
    private async Task<Workflow> EnqueueWithStatus(
        EngineRepository repo,
        string collectionKey,
        PersistentItemStatus status,
        Guid? dependsOn = null,
        string ns = Ns
    )
    {
        var id = Assert.Single(
            await Enqueue(
                repo,
                ns,
                collectionKey,
                [Request("wf", dependsOn is { } d ? [d] : null) with { DependsOnHeads = false }]
            )
        );

        await using var context = fixture.CreateDbContext();
        var leaseToken = Guid.NewGuid();
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.workflows SET status = {(int)status}, lease_token = {leaseToken} WHERE id = {id}",
            TestContext.Current.CancellationToken
        );
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.steps SET status = {(int)status} WHERE job_id = {id}",
            TestContext.Current.CancellationToken
        );

        var workflow = await fixture.GetWorkflow(id);
        Assert.NotNull(workflow);
        workflow.Status = status;
        return workflow;
    }

    private static async Task<MailboxResponse> MintMailbox(EngineRepository repo) =>
        Assert
            .IsType<MailboxMintResult.Minted>(
                await repo.MintMailbox(
                    Guid.CreateVersion7(),
                    Ns,
                    "mailbox-key",
                    collectionKey: null,
                    TimeSpan.FromHours(1),
                    DateTimeOffset.UtcNow,
                    maxOpenPerCollection: 100,
                    TestContext.Current.CancellationToken
                )
            )
            .Mailbox;

    /// <summary>Changes the database through other connections just before the heads' statuses are read.</summary>
    private sealed class BeforeHeadStatusesRead(Func<Task> change) : DbCommandInterceptor
    {
        private readonly TaskCompletionSource _changed = new();

        public Task Changed => _changed.Task;

        public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default
        )
        {
            if (
                command.CommandText.Contains(
                    $"\"{nameof(CollectionHeadStatus.StepsCompleted)}\"",
                    StringComparison.Ordinal
                ) && !_changed.Task.IsCompleted
            )
            {
                await change();
                _changed.SetResult();
            }

            return result;
        }
    }

    /// <summary>A connection of its own that listens on <c>collection_changed</c>, as another replica's would.</summary>
    private sealed class Listener : IAsyncDisposable
    {
        private const string DrainedChannel = "test_drained";

        private readonly NpgsqlConnection _conn;
        private readonly List<CollectionId> _received = [];
        private bool _drained;

        private Listener(NpgsqlConnection conn)
        {
            _conn = conn;
            _conn.Notification += (_, e) =>
            {
                if (e.Channel == DrainedChannel)
                    _drained = true;
                else if (e.Channel == EngineRepository.StatusChangedChannel)
                    StatusChanges++;
                else
                    _received.Add(
                        CollectionChangedNotification.TryDecode(e.Payload, out var collection)
                            ? collection
                            : new CollectionId("unreadable", e.Payload)
                    );
            };
        }

        /// <summary>How many <c>status_changed</c> notifications arrived; read it after <see cref="Drain"/>.</summary>
        public int StatusChanges { get; private set; }

        public static async Task<Listener> Start(string connectionString)
        {
            var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync(TestContext.Current.CancellationToken);
            await using var cmd = new NpgsqlCommand(
                $"LISTEN {CollectionChangedNotification.Channel}; LISTEN {EngineRepository.StatusChangedChannel}; "
                    + $"LISTEN {DrainedChannel}",
                conn
            );
            await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
            return new Listener(conn);
        }

        /// <summary>
        /// The collections notified by the transactions committed so far: PostgreSQL delivers notifications in commit
        /// order, so they all arrive before one this sends now.
        /// </summary>
        public async Task<IReadOnlyList<CollectionId>> Drain()
        {
            _drained = false;
            await using (var cmd = new NpgsqlCommand($"NOTIFY {DrainedChannel}", _conn))
                await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);

            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(10));
            while (!_drained)
                await _conn.WaitAsync(timeout.Token);

            return [.. _received];
        }

        public ValueTask DisposeAsync() => _conn.DisposeAsync();
    }
}
