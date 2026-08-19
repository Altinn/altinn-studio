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
/// Covers the two sweeps a mailbox's lifetime needs: the closure sweep that makes the deadline a promise
/// rather than a column, and the retention purge that eventually takes a closed mailbox away with its
/// deliveries and receiver registrations.
/// </summary>
/// <remarks>
/// Both are claim-and-act loops over rows other transactions are free to be holding, so the properties
/// worth testing are the ones a happy-path run cannot show: that one mailbox failing does not take the
/// batch with it, that a mailbox somebody else holds is skipped rather than waited on, and that the purge
/// order is enforced by the schema rather than by the order this code happens to be written in. Each of
/// those is established by making the thing go wrong on purpose, because a test that only watches a
/// working sweep stays green against a broken one.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class MailboxSweepTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "sweep-ns";

    /// <summary>
    /// Retention settings for the purge below. Built here rather than taken from the fixture because the
    /// fixture leaves <see cref="RetentionSettings"/> at its zero-valued default, and a zero
    /// <c>BatchSize</c> makes <see cref="DbMaintenanceService.PurgeExpiredWorkflows"/>'s
    /// <c>while (deleted &gt;= batchSize)</c> condition never terminate.
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
        // The deadline stops being a stamped column and becomes the promise the whole design leans on:
        // nothing closed this mailbox, its deadline passed, and the sweep ran exactly the routine DELETE
        // runs — including the reason, which is the one thing a caller-driven close could not have written.
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
        // The sweep has no second half. It enqueues nothing, because the workflows that will conclude the
        // exchange already exist and carry the app's own steps — closing releases them. Both of them, not
        // the next one: a closed mailbox freezes every parked receiver's truth at the same instant.
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
        // The leftover class the design refuses to assume away. A DELETE reports this number to a caller
        // who is in a position to act on it; a mailbox that aged out has no such caller, so the sweep is
        // the only place it is ever seen. Three arrived, one receiver was enqueued: two were never read.
        var repository = fixture.CreateRepository();
        var mailbox = await MintOverdue(repository, "unread");
        await EnqueueReceiver(repository, mailbox.Id, "receiver-1");
        foreach (var key in new[] { "msg-1", "msg-2", "msg-3" })
            Assert.IsType<MailboxDeliveryResult.Accepted>(await Deliver(repository, mailbox.Id, key));

        var result = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);

        Assert.Equal(1, result.Closed);
        Assert.Equal(2, result.UnconsumedDeliveries);

        // And the rows stay readable, which is what makes the number actionable rather than merely alarming.
        await using var context = fixture.CreateDbContext();
        Assert.Equal(3, await context.MailboxDeliveries.CountAsync(d => d.MailboxId == mailbox.Id, Ct));
    }

    [Fact]
    public async Task Sweep_LosesToADeleteThatClosedFirst_AndReportsNothing()
    {
        // A DELETE racing the sweep is first-writer-wins, and the loser never reaches the routine at all:
        // the claim's own status predicate is re-evaluated against the locked row, so an already-closed
        // mailbox is not claimed and its reason and instant are left exactly as the winner wrote them.
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
        // SKIP LOCKED is what makes the claim a claim rather than a queue. A mailbox another pod's sweep,
        // a delivery, a close or an enqueue is holding is left for the next tick — and, crucially, the
        // rest of the batch is closed *now* rather than behind it.
        //
        // Discriminating in both directions: drop SKIP LOCKED and this blocks until the holder commits,
        // failing the elapsed-time assertion; drop FOR UPDATE altogether and the close's own UPDATE blocks
        // on the same row instead, failing it identically.
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

        // Raced against a timer rather than measured after the fact, because the failure this guards
        // against is a block that never returns: measuring elapsed time after the await would turn a
        // regression into a hung test run instead of a red one.
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

        // And nothing is lost by skipping: the next tick claims it.
        await blockingTx.RollbackAsync(Ct);
        Assert.Equal(1, (await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct)).Closed);
        Assert.Equal(MailboxStatus.Disposed, (await repository.GetMailbox(held.Id, Ns, Ct))!.Status);
    }

    [Fact]
    public async Task Sweep_WhenOneMailboxThrows_ClosesTheRestAndLeavesThatOneClaimable()
    {
        // The one lesson carried over from the exchange sweep this replaces, and the reason it is
        // load-bearing rather than defensive: the candidates are ordered by deadline, so a mailbox whose
        // close throws would lead every subsequent batch too. Without per-mailbox isolation that is not a
        // delayed close but a permanent wedge, taking the deadline guarantee down with every exchange
        // queued behind it.
        //
        // The failure is manufactured rather than waited for: a trigger that raises on an UPDATE of one
        // specific mailbox row makes exactly that mailbox's close throw, inside its own transaction, on a
        // real database. Removing the per-mailbox catch in EngineRepository.SweepOverdueMailboxes turns
        // this test red on its own — verified by doing it.
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

            // The failed one rolled back whole: still open, its receiver still parked, nothing half-written.
            Assert.Equal(MailboxStatus.Open, (await repository.GetMailbox(poisoned.Id, Ns, Ct))!.Status);
            Assert.Equal(PersistentItemStatus.Held, await StatusOf(receiver));
        }
        finally
        {
            await LiftPoison();
        }

        // Claimable next tick, which is what makes "left open" a delay rather than a loss.
        var recovered = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);
        Assert.Equal(1, recovered.Closed);
        Assert.Equal(0, recovered.Failed);
        Assert.Equal(MailboxStatus.Disposed, (await repository.GetMailbox(poisoned.Id, Ns, Ct))!.Status);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));
    }

    [Fact]
    public async Task SweepPass_TakesAtMostItsBatchSize_WhichBoundsTheStatementAndNotTheTick()
    {
        // The batch size bounds how much work one claim-and-close pass holds open. It is not a bound on
        // how fast a backlog drains — the service loops passes until nothing is left, which is the half
        // pinned by the test below — and reading it as one is what would quietly make the deadline
        // guarantee `ceil(overdue / batchSize)` cadences instead of one.
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
        // The bound the whole step exists to move: a receiver parks until its mailbox actually closes,
        // which MaxMailboxTimeout's derivation charges at deadline plus **one** MailboxSweepInterval. That
        // is only true if a tick drains. One batch per tick would make the real gap
        // `ceil(overdue / SweepBatchSize)` intervals — at a hundred per five minutes, a mass-timeout event
        // of five thousand mailboxes would take four hours rather than five minutes, and every assertion
        // on the derivation would stay green throughout.
        //
        // More overdue mailboxes than one pass can take, so a single-batch tick fails here and nowhere
        // else.
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
        // The `Closed > 0` guard, and why the drain cannot become a spin. A pass that comes back full is
        // the drain's signal that more work is waiting — but a batch that is full of *failures* is not more
        // work, it is the same work again: every one of those mailboxes is still open, still overdue, and
        // still leads the candidate scan. Without the guard the loop would re-claim exactly the same
        // hundred forever inside a single tick.
        //
        // It has to be a *full batch* of failures to discriminate, which is why this seeds SweepBatchSize
        // of them and poisons every mailbox rather than one. A single poisoned mailbox leaves the pass
        // short, so the loop would exit on the length condition alone and the guard would go untested.
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

        // Left exactly as they were, and claimable by the next cadence.
        await using var context = fixture.CreateDbContext();
        Assert.Equal(
            MailboxDeadlineService.SweepBatchSize,
            await context.Mailboxes.CountAsync(m => m.Status == MailboxStatus.Open, Ct)
        );
    }

    [Fact]
    public async Task SweepService_RunsOnTheMailboxSweepInterval_NotTheMaintenanceInterval()
    {
        // The drift guard the settings' derivation needs. MaxMailboxTimeout charges one
        // MailboxSweepInterval for the gap between a deadline and the close that honors it, and
        // CallbackTokenLifetimeInvariantTests pins that arithmetic — but the arithmetic is only about
        // reality if the service actually runs on that setting. Wire it to MaintenanceInterval instead and
        // every assertion there stays green while a receiver parks past its token's validity.
        //
        // Advancing to the maintenance interval and finding the mailbox still open is what makes this
        // discriminating; a test that only advanced past both would pass either way.
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
            // The loop has to reach its delay before the clock is moved: a fake timer created after the
            // advance would simply be due a full interval later, and the test would hang rather than fail.
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
        // Age is not the test — closure is. An open mailbox is an exchange in progress whatever its
        // timestamps say, and if it is past its deadline the closure sweep is what owes it an answer;
        // purging it here would delete an exchange out from under receivers still parked on it.
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
        // The purge order is not a convention this code keeps — it is a rule the schema enforces. Both
        // child tables reference engine.mailboxes with ON DELETE RESTRICT, the only non-cascade foreign
        // keys in the schema, chosen so that getting the order wrong raises 23001 restrict_violation
        // rather than silently taking rows with it. The wrong order is attempted here so that the
        // protection is demonstrated rather than described.
        //
        // 23001 rather than 23503 is PostgreSQL 18+ behavior, and that makes this assertion stronger than
        // a foreign-key check: on PG 17 and earlier both RESTRICT and NO ACTION raise 23503, so only on
        // the pinned postgres:18 does this distinguish RESTRICT from a NO ACTION regression. It is
        // therefore coupled to that pin — a server downgrade turns it red, and a bump should re-confirm
        // the code before relaxing it.
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

        // And again with only the registration left, so the second foreign key is shown to be RESTRICT too
        // rather than inferred from the first one having fired.
        await context.Database.ExecuteSqlAsync(
            $"DELETE FROM engine.mailbox_deliveries WHERE mailbox_id = {mailbox.Id}",
            Ct
        );
        var withRegistrations = await Assert.ThrowsAsync<PostgresException>(async () =>
            await context.Database.ExecuteSqlAsync($"DELETE FROM engine.mailboxes WHERE id = {mailbox.Id}", Ct)
        );
        Assert.Equal(PostgresErrorCodes.RestrictViolation, withRegistrations.SqlState);

        // The order the purge actually uses is the one that works.
        await fixture.CreateMaintenanceService().PurgeExpiredMailboxes(Now, _retention, Ct);
        Assert.Null(await repository.GetMailbox(mailbox.Id, Ns, Ct));
    }

    [Fact]
    public async Task Retention_LeavesAPurgedReceiversRegistration_UntilItsMailboxGoes()
    {
        // Receive workflows purge under the workflow sweep, independently and possibly first, so a
        // registration
        // can outlive the workflow it names. That dangles nothing — mailbox_receivers.workflow_id
        // deliberately carries no foreign key, and the row is a record of a rendezvous that already
        // happened — and the mailbox purge is what eventually takes it.
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

    /// <summary>
    /// Settings for the sweep service under test, carrying the two intervals apart so a test can tell
    /// which one the service actually read.
    /// </summary>
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
    /// Mints a mailbox whose deadline has already passed, by minting it in the past. The deadline is
    /// derived from the mint instant, so this is the only honest way to produce one — nothing writes a
    /// deadline directly.
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

    /// <summary>
    /// Gives a sweep that should not have run every chance to prove otherwise. This is the half of the
    /// cadence test that discriminates, so the window is generous rather than tight.
    /// </summary>
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

    /// <summary>
    /// Polls until the background sweep has closed the mailbox. Its loop runs on a timer, so the instant
    /// it acts is not something the test can await directly.
    /// </summary>
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

    /// <summary>
    /// Makes any update of one specific mailbox row throw, so that exactly one mailbox's close fails
    /// inside its own transaction on a real database.
    /// </summary>
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

    /// <summary>
    /// Makes every mailbox update throw, so a whole batch of closes fails rather than one.
    /// </summary>
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
