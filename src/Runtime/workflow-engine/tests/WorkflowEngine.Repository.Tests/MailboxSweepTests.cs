using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Npgsql;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Covers the deadline sweep and the mailbox retention purge. Both are claim-and-act loops over rows
/// other transactions may hold, so each property is established by making the thing go wrong on purpose.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class MailboxSweepTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "sweep-ns";

    /// <summary>
    /// Built here because the fixture's zero-valued <see cref="RetentionSettings"/> default (BatchSize 0)
    /// makes the purge loop never terminate.
    /// </summary>
    private static readonly RetentionSettings _retention = new()
    {
        RetentionPeriod = TimeSpan.FromDays(60),
        BatchSize = 1000,
        Interval = TimeSpan.FromHours(2),
    };

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    #region The deadline sweep

    [Fact]
    public async Task Sweep_ClosesAnOverdueMailbox_RecordingTheDeadlineAsTheReason()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintOverdue(repository, "overdue");

        var result = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);

        Assert.Equal(1, result.Closed);
        Assert.Equal(0, result.Failed);

        var swept = await repository.GetMailbox(mailbox.Id, Ns, Ct);
        Assert.NotNull(swept);
        Assert.Equal(MailboxStatus.Disposed, swept.Status);
        Assert.Equal(MailboxDisposedReason.Deadline, swept.DisposedReason);
        Assert.NotNull(swept.DisposedAt);
    }

    [Fact]
    public async Task Sweep_LeavesAMailboxWhoseDeadlineHasNotPassed()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await Mint(repository, "not-yet", TimeSpan.FromDays(7));

        var result = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);

        Assert.Equal(0, result.Closed);
        Assert.Equal(MailboxStatus.Open, (await repository.GetMailbox(mailbox.Id, Ns, Ct))!.Status);
    }

    [Fact]
    public async Task Sweep_ReleasesEveryParkedReceiver_TheSameWayDeleteDoes()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintOverdue(repository, "with-receivers");
        var first = await EnqueueReceiver(repository, mailbox.Id, "receiver-1");
        var second = await EnqueueReceiver(repository, mailbox.Id, "receiver-2");

        Assert.Equal(PersistentItemStatus.Held, await StatusOf(first));
        Assert.Equal(PersistentItemStatus.Held, await StatusOf(second));

        var result = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);

        Assert.Equal(1, result.Closed);
        Assert.Equal(2, result.ReceiversReleased);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(first));
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(second));

        await using var context = fixture.CreateDbContext();
        var registrations = await context.MailboxReceivers.Where(w => w.MailboxId == mailbox.Id).ToListAsync(Ct);
        Assert.Equal(2, registrations.Count);
        Assert.All(registrations, r => Assert.NotNull(r.ReleasedAt));
    }

    [Fact]
    public async Task Sweep_CountsTheDeliveriesNoReceiverWasEverEnqueuedFor()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintOverdue(repository, "unread");
        await EnqueueReceiver(repository, mailbox.Id, "receiver-1");
        foreach (var key in new[] { "msg-1", "msg-2", "msg-3" })
            Assert.IsType<MailboxDeliveryResult.Accepted>(await Deliver(repository, mailbox.Id, key));

        var result = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);

        Assert.Equal(1, result.Closed);
        Assert.Equal(2, result.UnpairedDeliveries);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(3, await context.MailboxDeliveries.CountAsync(d => d.MailboxId == mailbox.Id, Ct));
    }

    [Fact]
    public async Task Sweep_LosesToADeleteThatClosedFirst_AndReportsNothing()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintOverdue(repository, "closed-by-request");
        var closedAt = Now.AddMinutes(-5);
        Assert.IsType<MailboxCloseResult.Closed>(
            await repository.CloseMailbox(mailbox.Id, Ns, MailboxDisposedReason.Request, closedAt, Ct)
        );

        var result = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);

        Assert.Equal(0, result.Closed);
        Assert.Equal(0, result.Failed);

        var unchanged = await repository.GetMailbox(mailbox.Id, Ns, Ct);
        Assert.Equal(MailboxDisposedReason.Request, unchanged!.DisposedReason);
        Assert.Equal(closedAt, unchanged.DisposedAt!.Value, TimeSpan.FromMilliseconds(1));
    }

    [Fact]
    public async Task Sweep_SkipsAMailboxWhoseRowIsHeldElsewhere_WithoutWaitingForIt()
    {
        var repository = fixture.CreateRepository();
        var held = await MintOverdue(repository, "held-elsewhere");
        var free = await MintOverdue(repository, "free");

        await using var conn = new NpgsqlConnection(fixture.ConnectionString);
        await conn.OpenAsync(Ct);
        await using var blockingTx = await conn.BeginTransactionAsync(Ct);
        await using (
            var lockCmd = new NpgsqlCommand(
                "SELECT id FROM engine.mailboxes WHERE id = @id FOR UPDATE",
                conn,
                blockingTx
            )
        )
        {
            lockCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", held.Id));
            await lockCmd.ExecuteNonQueryAsync(Ct);
        }

        var sweep = repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);
        var finishedFirst = await Task.WhenAny(sweep, Task.Delay(TimeSpan.FromSeconds(5), Ct));
        Assert.True(
            ReferenceEquals(finishedFirst, sweep),
            "The sweep was still running five seconds after another transaction took one mailbox's row: it queued "
                + "behind the lock instead of skipping it, so a single slow holder stalls every overdue mailbox "
                + "behind it in the batch."
        );

        var result = await sweep;
        Assert.Equal(1, result.Closed);
        Assert.Equal(MailboxStatus.Disposed, (await repository.GetMailbox(free.Id, Ns, Ct))!.Status);
        Assert.Equal(MailboxStatus.Open, (await repository.GetMailbox(held.Id, Ns, Ct))!.Status);

        await blockingTx.RollbackAsync(Ct);
        Assert.Equal(1, (await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct)).Closed);
        Assert.Equal(MailboxStatus.Disposed, (await repository.GetMailbox(held.Id, Ns, Ct))!.Status);
    }

    [Fact]
    public async Task Sweep_WhenOneMailboxThrows_ClosesTheRestAndLeavesThatOneClaimable()
    {
        var repository = fixture.CreateRepository();
        var poisoned = await MintOverdue(repository, "poisoned", deadlineAge: TimeSpan.FromDays(30));
        var behindIt = await MintOverdue(repository, "behind-it", deadlineAge: TimeSpan.FromDays(1));
        var receiver = await EnqueueReceiver(repository, poisoned.Id, "receiver-1");

        await PoisonMailboxUpdates(poisoned.Id);
        try
        {
            var result = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);

            Assert.Equal(1, result.Failed);
            Assert.Equal(1, result.Closed);
            Assert.Equal(MailboxStatus.Disposed, (await repository.GetMailbox(behindIt.Id, Ns, Ct))!.Status);

            Assert.Equal(MailboxStatus.Open, (await repository.GetMailbox(poisoned.Id, Ns, Ct))!.Status);
            Assert.Equal(PersistentItemStatus.Held, await StatusOf(receiver));
        }
        finally
        {
            await LiftPoison();
        }

        var recovered = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);
        Assert.Equal(1, recovered.Closed);
        Assert.Equal(0, recovered.Failed);
        Assert.Equal(MailboxStatus.Disposed, (await repository.GetMailbox(poisoned.Id, Ns, Ct))!.Status);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));
    }

    [Fact]
    public async Task SweepPass_TakesAtMostItsBatchSize_WhichBoundsTheStatementAndNotTheTick()
    {
        var repository = fixture.CreateRepository();
        for (var i = 0; i < 5; i++)
            await MintOverdue(repository, $"overdue-{i}");

        Assert.Equal(2, (await repository.SweepOverdueMailboxes(Now, batchSize: 2, Ct)).Closed);
        Assert.Equal(2, (await repository.SweepOverdueMailboxes(Now, batchSize: 2, Ct)).Closed);
        Assert.Equal(1, (await repository.SweepOverdueMailboxes(Now, batchSize: 2, Ct)).Closed);
        Assert.Equal(0, (await repository.SweepOverdueMailboxes(Now, batchSize: 2, Ct)).Closed);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.Mailboxes.CountAsync(m => m.Status == MailboxStatus.Open, Ct));
    }

    [Fact]
    public async Task SweepTick_DrainsEveryOverdueMailbox_HoweverManyBatchesThatTakes()
    {
        var repository = fixture.CreateRepository();
        var overdue = MailboxDeadlineService.SweepBatchSize + 7;
        for (var i = 0; i < overdue; i++)
            await MintOverdue(repository, $"overdue-{i}");

        using var service = new MailboxDeadlineService(
            NullLogger<MailboxDeadlineService>.Instance,
            new FakeTimeProvider(Now),
            repository,
            Options.Create(SweepSettings())
        );

        var result = await service.SweepOverdueMailboxes(Now, Ct);

        Assert.Equal(overdue, result.Closed);
        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.Mailboxes.CountAsync(m => m.Status == MailboxStatus.Open, Ct));
    }

    [Fact]
    public async Task SweepTick_EndsWhenAPassClosesNothing_RatherThanSpinningOnFailures()
    {
        var repository = fixture.CreateRepository();
        for (var i = 0; i < MailboxDeadlineService.SweepBatchSize; i++)
            await MintOverdue(repository, $"poisoned-{i}");

        await PoisonEveryMailboxUpdate();

        try
        {
            using var service = new MailboxDeadlineService(
                NullLogger<MailboxDeadlineService>.Instance,
                new FakeTimeProvider(Now),
                repository,
                Options.Create(SweepSettings())
            );

            var tick = service.SweepOverdueMailboxes(Now, Ct);
            var finishedFirst = await Task.WhenAny(tick, Task.Delay(TimeSpan.FromSeconds(30), Ct));
            Assert.True(
                ReferenceEquals(finishedFirst, tick),
                "The sweep tick never returned against a full batch of mailboxes that always throw: the "
                    + "drain loop is treating a batch full of failures as a batch full of work and "
                    + "re-claiming the same mailboxes forever, instead of leaving them for the next cadence."
            );

            var result = await tick;
            Assert.Equal(0, result.Closed);
            Assert.Equal(MailboxDeadlineService.SweepBatchSize, result.Failed);
        }
        finally
        {
            await LiftPoison();
        }

        await using var context = fixture.CreateDbContext();
        Assert.Equal(
            MailboxDeadlineService.SweepBatchSize,
            await context.Mailboxes.CountAsync(m => m.Status == MailboxStatus.Open, Ct)
        );
    }

    [Fact]
    public async Task SweepService_RunsOnTheMailboxSweepInterval_NotTheMaintenanceInterval()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintOverdue(repository, "swept-by-the-service");

        var settings = Options.Create(SweepSettings());

        var timeProvider = new FakeTimeProvider(Now);
        using var service = new MailboxDeadlineService(
            NullLogger<MailboxDeadlineService>.Instance,
            timeProvider,
            repository,
            settings
        );

        await service.StartAsync(Ct);
        try
        {
            // The loop must reach its delay before the clock moves, or the test hangs instead of failing.
            await Task.Delay(TimeSpan.FromMilliseconds(250), Ct);

            timeProvider.Advance(settings.Value.MaintenanceInterval);
            await AssertMailboxStaysOpen(repository, mailbox.Id);

            timeProvider.Advance(settings.Value.MailboxSweepInterval - settings.Value.MaintenanceInterval);
            await WaitUntilMailboxDisposed(repository, mailbox.Id);
        }
        finally
        {
            await service.StopAsync(CancellationToken.None);
        }

        Assert.Equal(MailboxDisposedReason.Deadline, (await repository.GetMailbox(mailbox.Id, Ns, Ct))!.DisposedReason);
    }

    #endregion

    #region Retention

    [Fact]
    public async Task Retention_PurgesAClosedMailbox_WithItsDeliveriesAndRegistrations()
    {
        var repository = fixture.CreateRepository();
        var longAgo = Now - _retention.RetentionPeriod - TimeSpan.FromDays(1);
        var mailbox = await Mint(repository, "purgeable", TimeSpan.FromHours(1), longAgo);
        await EnqueueReceiver(repository, mailbox.Id, "receiver-1");
        await Deliver(repository, mailbox.Id, "msg-1");
        await repository.CloseMailbox(mailbox.Id, Ns, MailboxDisposedReason.Deadline, longAgo, Ct);

        await fixture.CreateMaintenanceService().PurgeExpiredMailboxes(Now, _retention, Ct);

        Assert.Null(await repository.GetMailbox(mailbox.Id, Ns, Ct));
        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxDeliveries.CountAsync(Ct));
        Assert.Equal(0, await context.MailboxReceivers.CountAsync(Ct));
    }

    [Fact]
    public async Task Retention_LeavesAnOpenMailbox_HoweverOldAndHoweverOverdue()
    {
        var repository = fixture.CreateRepository();
        var longAgo = Now - _retention.RetentionPeriod - TimeSpan.FromDays(1);
        var mailbox = await Mint(repository, "still-open", TimeSpan.FromHours(1), longAgo);

        await fixture.CreateMaintenanceService().PurgeExpiredMailboxes(Now, _retention, Ct);

        Assert.Equal(MailboxStatus.Open, (await repository.GetMailbox(mailbox.Id, Ns, Ct))!.Status);
    }

    [Fact]
    public async Task Retention_LeavesAMailboxClosedInsideTheCutoff()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await Mint(repository, "recently-closed", TimeSpan.FromHours(1), Now.AddDays(-90));
        await repository.CloseMailbox(mailbox.Id, Ns, MailboxDisposedReason.Request, Now.AddDays(-1), Ct);

        await fixture.CreateMaintenanceService().PurgeExpiredMailboxes(Now, _retention, Ct);

        Assert.NotNull(await repository.GetMailbox(mailbox.Id, Ns, Ct));
    }

    [Fact]
    public async Task Retention_PurgingTheMailboxBeforeItsChildren_IsRefusedBySqlstate23001()
    {
        var repository = fixture.CreateRepository();
        var longAgo = Now - _retention.RetentionPeriod - TimeSpan.FromDays(1);
        var mailbox = await Mint(repository, "children-first", TimeSpan.FromHours(1), longAgo);
        await EnqueueReceiver(repository, mailbox.Id, "receiver-1");
        await Deliver(repository, mailbox.Id, "msg-1");
        await repository.CloseMailbox(mailbox.Id, Ns, MailboxDisposedReason.Deadline, longAgo, Ct);

        await using var context = fixture.CreateDbContext();

        var withDeliveries = await Assert.ThrowsAsync<PostgresException>(async () =>
            await context.Database.ExecuteSqlAsync($"DELETE FROM engine.mailboxes WHERE id = {mailbox.Id}", Ct)
        );
        Assert.Equal(PostgresErrorCodes.RestrictViolation, withDeliveries.SqlState);

        await context.Database.ExecuteSqlAsync(
            $"DELETE FROM engine.mailbox_deliveries WHERE mailbox_id = {mailbox.Id}",
            Ct
        );
        var withRegistrations = await Assert.ThrowsAsync<PostgresException>(async () =>
            await context.Database.ExecuteSqlAsync($"DELETE FROM engine.mailboxes WHERE id = {mailbox.Id}", Ct)
        );
        Assert.Equal(PostgresErrorCodes.RestrictViolation, withRegistrations.SqlState);

        await fixture.CreateMaintenanceService().PurgeExpiredMailboxes(Now, _retention, Ct);
        Assert.Null(await repository.GetMailbox(mailbox.Id, Ns, Ct));
    }

    [Fact]
    public async Task Retention_LeavesAPurgedReceiversRegistration_UntilItsMailboxGoes()
    {
        var repository = fixture.CreateRepository();
        var longAgo = Now - _retention.RetentionPeriod - TimeSpan.FromDays(1);
        var mailbox = await Mint(repository, "purged-receiver", TimeSpan.FromHours(1), longAgo);
        var receiver = await EnqueueReceiver(repository, mailbox.Id, "receiver-1");
        await repository.CloseMailbox(mailbox.Id, Ns, MailboxDisposedReason.Deadline, longAgo, Ct);

        await using (var context = fixture.CreateDbContext())
        {
            await context.Database.ExecuteSqlAsync(
                $"UPDATE engine.workflows SET status = {(int)PersistentItemStatus.Completed}, updated_at = {longAgo} WHERE id = {receiver}",
                Ct
            );
        }

        var maintenance = fixture.CreateMaintenanceService();
        await maintenance.PurgeExpiredWorkflows(Now, _retention, Ct);

        await using (var context = fixture.CreateDbContext())
        {
            Assert.False(await context.Workflows.AnyAsync(w => w.Id == receiver, Ct));
            Assert.True(await context.MailboxReceivers.AnyAsync(w => w.WorkflowId == receiver, Ct));
        }

        await maintenance.PurgeExpiredMailboxes(Now, _retention, Ct);

        await using (var context = fixture.CreateDbContext())
        {
            Assert.False(await context.MailboxReceivers.AnyAsync(Ct));
            Assert.False(await context.Mailboxes.AnyAsync(Ct));
        }
    }

    [Fact]
    public async Task Retention_DrainsEveryEligibleMailbox_InBatches()
    {
        var repository = fixture.CreateRepository();
        var longAgo = Now - _retention.RetentionPeriod - TimeSpan.FromDays(1);
        for (var i = 0; i < 5; i++)
        {
            var mailbox = await Mint(repository, $"purgeable-{i}", TimeSpan.FromHours(1), longAgo);
            await repository.CloseMailbox(mailbox.Id, Ns, MailboxDisposedReason.Deadline, longAgo, Ct);
        }

        await fixture.CreateMaintenanceService().PurgeExpiredMailboxes(Now, _retention with { BatchSize = 2 }, Ct);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.Mailboxes.CountAsync(Ct));
    }

    #endregion

    #region Helpers

    /// <summary>Carries the two intervals apart so a test can tell which one the service read.</summary>
    private static EngineSettings SweepSettings() =>
        new()
        {
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            MaxStepCommandTimeout = TimeSpan.FromHours(2),
            DefaultStepRetryStrategy = null!,
            DatabaseCommandTimeout = TimeSpan.FromSeconds(30),
            DatabaseRetryStrategy = null!,
            MetricsCollectionInterval = TimeSpan.FromSeconds(5),
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
            HeartbeatInterval = TimeSpan.FromSeconds(3),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
            MaintenanceInterval = TimeSpan.FromMinutes(1),
            MailboxSweepInterval = TimeSpan.FromMinutes(5),
        };

    private static DateTimeOffset Now => DateTimeOffset.UtcNow;

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static async Task<MailboxResponse> Mint(
        EngineRepository repository,
        string key,
        TimeSpan timeout,
        DateTimeOffset? now = null
    ) =>
        Assert
            .IsType<MailboxMintResult.Minted>(
                await repository.MintMailbox(
                    Guid.CreateVersion7(),
                    Ns,
                    key,
                    collectionKey: null,
                    timeout,
                    now ?? Now,
                    maxOpenPerCollection: 100,
                    Ct
                )
            )
            .Mailbox;

    /// <summary>
    /// Mints a mailbox in the past: the deadline is derived from the mint instant, so this is the only way to
    /// produce an overdue one.
    /// </summary>
    private static Task<MailboxResponse> MintOverdue(
        EngineRepository repository,
        string key,
        TimeSpan? deadlineAge = null
    )
    {
        var age = deadlineAge ?? TimeSpan.FromDays(1);
        return Mint(repository, key, TimeSpan.FromMinutes(1), Now - age - TimeSpan.FromMinutes(1));
    }

    private static Task<MailboxDeliveryResult> Deliver(EngineRepository repository, Guid mailboxId, string key) =>
        repository.DeliverToMailbox(mailboxId, Ns, key, payload: "{}", Now, maxLogLength: 100, Ct);

    private static async Task<Guid> EnqueueReceiver(EngineRepository repository, Guid mailboxId, string idempotencyKey)
    {
        var request = new WorkflowRequest
        {
            OperationId = "receive",
            Mailbox = new MailboxReference { Id = mailboxId },
            Steps =
            [
                new StepRequest
                {
                    OperationId = "handle-reply",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };

        var metadata = new WorkflowRequestMetadata(Ns, idempotencyKey, null, Now, null);
        var results = await repository.BatchEnqueueWorkflows(
            [
                new BufferedEnqueueRequest(
                    new WorkflowEnqueueRequest { Workflows = [request] },
                    metadata,
                    SHA256.HashData(Encoding.UTF8.GetBytes(idempotencyKey)),
                    new TaskCompletionSource<WorkflowEnqueueOutcome>(TaskCreationOptions.RunContinuationsAsynchronously)
                ),
            ],
            Ct
        );

        return Assert.Single(Assert.Single(results).WorkflowIds!);
    }

    private async Task<PersistentItemStatus> StatusOf(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        return (await context.Workflows.SingleAsync(w => w.Id == workflowId, Ct)).Status;
    }

    private static async Task AssertMailboxStaysOpen(EngineRepository repository, Guid mailboxId)
    {
        for (var i = 0; i < 10; i++)
        {
            var mailbox = await repository.GetMailbox(mailboxId, Ns, Ct);
            Assert.True(
                mailbox!.Status == MailboxStatus.Open,
                "The mailbox closed after only the maintenance interval had elapsed: the closure sweep is not "
                    + "running on MailboxSweepInterval, so the term MaxMailboxTimeout's derivation charges for it "
                    + "no longer describes the sweep that exists."
            );
            await Task.Delay(20, Ct);
        }
    }

    /// <summary>Polls: the sweep runs on its own timer, so the test cannot await the close directly.</summary>
    private static async Task WaitUntilMailboxDisposed(EngineRepository repository, Guid mailboxId)
    {
        var deadline = DateTime.UtcNow + TimeSpan.FromSeconds(10);
        while (DateTime.UtcNow < deadline)
        {
            var mailbox = await repository.GetMailbox(mailboxId, Ns, Ct);
            if (mailbox!.Status == MailboxStatus.Disposed)
                return;

            await Task.Delay(50, Ct);
        }

        Assert.Fail($"Mailbox {mailboxId} was never closed by the sweep service.");
    }

    /// <summary>Makes updates of one specific mailbox row throw, via a trigger on the real database.</summary>
    private async Task PoisonMailboxUpdates(Guid mailboxId)
    {
        await using var context = fixture.CreateDbContext();

        // The only interpolated value is a Guid this test just minted; DDL cannot take it as a parameter.
#pragma warning disable EF1002
        await context.Database.ExecuteSqlRawAsync(
            $"""
            CREATE OR REPLACE FUNCTION engine.poison_mailbox() RETURNS trigger AS $$
            BEGIN
                IF NEW.id = '{mailboxId}'::uuid THEN
                    RAISE EXCEPTION 'poisoned mailbox %', NEW.id;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER poison_mailbox_updates
            BEFORE UPDATE ON engine.mailboxes
            FOR EACH ROW EXECUTE FUNCTION engine.poison_mailbox();
            """,
            Ct
        );
#pragma warning restore EF1002
    }

    /// <summary>Makes every mailbox update throw, so a whole batch of closes fails rather than one.</summary>
    private async Task PoisonEveryMailboxUpdate()
    {
        await using var context = fixture.CreateDbContext();
        await context.Database.ExecuteSqlRawAsync(
            """
            CREATE OR REPLACE FUNCTION engine.poison_mailbox() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'poisoned mailbox %', NEW.id;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER poison_mailbox_updates
            BEFORE UPDATE ON engine.mailboxes
            FOR EACH ROW EXECUTE FUNCTION engine.poison_mailbox();
            """,
            Ct
        );
    }

    private async Task LiftPoison()
    {
        await using var context = fixture.CreateDbContext();
        await context.Database.ExecuteSqlRawAsync(
            """
            DROP TRIGGER IF EXISTS poison_mailbox_updates ON engine.mailboxes;
            DROP FUNCTION IF EXISTS engine.poison_mailbox();
            """,
            Ct
        );
    }

    #endregion
}
