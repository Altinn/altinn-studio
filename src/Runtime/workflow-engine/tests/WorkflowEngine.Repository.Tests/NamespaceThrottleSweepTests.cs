using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Drives <see cref="NamespaceThrottleService"/> sweep cycles against real Postgres, pinning the
/// breaker state machine: dual-condition trip detection, canary selection and progress judgment
/// by requeue-count comparison, jittered and deadline-clamped parking, window extension with
/// canary rotation, oldest-first doubling release cohorts, re-trip semantics, and the closed
/// grace period. Cycles are invoked directly with an explicit <c>now</c> — no timers, no sleeps.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class NamespaceThrottleSweepTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "throttled-namespace";

    private static readonly TimeSpan _sweepInterval = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan _initialWindow = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan _maxWindow = TimeSpan.FromMinutes(40);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private IOptions<EngineSettings> Settings(
        bool enabled = true,
        int minRequeuedWorkflows = 4,
        double minRequeuedRatio = 0.5,
        int canaryCount = 2
    ) =>
        Options.Create(
            fixture.Settings with
            {
                // A realistic default strategy (24h budget) so unclamped stamps stay unclamped.
                DefaultStepRetryStrategy = RetryStrategy.Exponential(
                    baseInterval: TimeSpan.FromSeconds(1),
                    maxDelay: TimeSpan.FromMinutes(5),
                    maxDuration: TimeSpan.FromHours(24)
                ),
                Throttling = new ThrottlingSettings
                {
                    Enabled = enabled,
                    MinRequeuedWorkflows = minRequeuedWorkflows,
                    MinRequeuedRatio = minRequeuedRatio,
                    SweepInterval = _sweepInterval,
                    CanaryCount = canaryCount,
                    InitialWindow = _initialWindow,
                    MaxWindow = _maxWindow,
                },
            }
        );

    // ---------------------------------------------------------------------------------------
    // Trip detection
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task Sweep_FloorMetButRatioNot_DoesNotTrip()
    {
        // Arrange — 4 requeued (meets floor 4) out of 10 active (ratio 0.4 < 0.5).
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);

        for (int i = 0; i < 4; i++)
            await InsertRequeuedWorkflow(context, repo);
        for (int i = 0; i < 6; i++)
            await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued, ns: Ns);

        // Act
        await service.RunSweepCycle(DateTimeOffset.UtcNow, TestContext.Current.CancellationToken);

        // Assert
        Assert.Null(await GetThrottle());
    }

    [Fact]
    public async Task Sweep_RatioMetButFloorNot_DoesNotTrip()
    {
        // Arrange — 3 requeued of 3 active (ratio 1.0) but below the floor of 4.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);

        for (int i = 0; i < 3; i++)
            await InsertRequeuedWorkflow(context, repo);

        // Act
        await service.RunSweepCycle(DateTimeOffset.UtcNow, TestContext.Current.CancellationToken);

        // Assert
        Assert.Null(await GetThrottle());
    }

    [Fact]
    public async Task Sweep_FloorAndRatioMet_TripsSelectsCanariesAndParksTheRest()
    {
        // Arrange — 6 requeued of 6 active; the two earliest backoff_until become canaries.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, view) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        var expectedCanaries = new List<Guid>
        {
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(1), stepRequeueCount: 3),
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(2), stepRequeueCount: 5),
        };
        var expectedParked = new List<Guid>();
        for (int i = 0; i < 4; i++)
        {
            expectedParked.Add(await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddMinutes(1 + i)));
        }

        // Act
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);

        // Assert — state row
        var throttle = await GetThrottle();
        Assert.NotNull(throttle);
        Assert.Equal(NamespaceThrottleState.Open, throttle.State);
        Assert.Equal(now, throttle.TrippedAt, TimeSpan.FromSeconds(1));
        Assert.Equal(_initialWindow, throttle.CurrentWindow);
        Assert.Equal(6, throttle.LastRequeuedCount);
        Assert.Equal(6, throttle.LastActiveCount);

        // Canary selection: the two earliest backoff_until, with requeue counts recorded at selection.
        Assert.Equal(expectedCanaries.Order(), throttle.Canaries.Select(c => c.WorkflowId).Order());
        Assert.Equal([3, 5], throttle.Canaries.Select(c => c.RequeueCount).Order());

        // Canaries are not parked; everything else is, jittered within ±20% of the window.
        var stamps = await GetThrottledUntil();
        foreach (var canaryId in expectedCanaries)
            Assert.Null(stamps[canaryId]);
        foreach (var parkedId in expectedParked)
        {
            var stamp = stamps[parkedId];
            Assert.NotNull(stamp);
            AssertWithinJitterBounds(stamp.Value, now, _initialWindow);
        }

        // The publication surface reports the open breaker with its window.
        var breaker = Assert.Single(view.OpenBreakers);
        Assert.Equal(Ns, breaker.Key);
        Assert.Equal(_initialWindow, breaker.Value);
    }

    // ---------------------------------------------------------------------------------------
    // Deadline clamp
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task Park_StampNeverPassesTheStepRetryDeadline()
    {
        // Arrange — one parked workflow's current step has only ~3 minutes of retry budget left
        // (MaxDuration 5m anchored at a step created 2m ago), far less than the 10m window.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        var stepCreatedAt = now.AddMinutes(-2);
        var nearDeadline = await InsertRequeuedWorkflow(
            context,
            repo,
            backoffUntil: now.AddMinutes(5),
            retryStrategy: RetryStrategy.Constant(TimeSpan.FromSeconds(1), maxDuration: TimeSpan.FromMinutes(5)),
            stepCreatedAt: stepCreatedAt
        );
        for (int i = 0; i < 5; i++)
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(i));

        // Act
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);

        // Assert — clamped exactly to the deadline computed from the handler's anchor rule.
        var stamps = await GetThrottledUntil();
        var stamp = stamps[nearDeadline];
        Assert.NotNull(stamp);
        Assert.Equal(stepCreatedAt.AddMinutes(5), stamp.Value, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Park_DeadlineAlreadyPassed_LeavesWorkflowUnparked()
    {
        // Arrange — the step's retry budget is already spent: its next attempt is its last, and
        // parking would only delay that final attempt.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        var pastDeadline = await InsertRequeuedWorkflow(
            context,
            repo,
            backoffUntil: now.AddMinutes(5),
            retryStrategy: RetryStrategy.Constant(TimeSpan.FromSeconds(1), maxDuration: TimeSpan.FromMinutes(1)),
            stepCreatedAt: now.AddMinutes(-2)
        );
        for (int i = 0; i < 5; i++)
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(i));

        // Act
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);

        // Assert
        var stamps = await GetThrottledUntil();
        Assert.Null(stamps[pastDeadline]);
    }

    // ---------------------------------------------------------------------------------------
    // Canary judgment
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task Sweep_CanariesStillPendingWithUnchangedCounts_KeepsWaiting()
    {
        // Arrange — trip, then sweep again with nothing changed: canaries are still Requeued
        // with their recorded counts, which is "no signal yet", not progress and not failure.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        for (int i = 0; i < 6; i++)
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(i));
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);
        var tripped = await GetThrottle();
        Assert.NotNull(tripped);

        // Act
        await service.RunSweepCycle(now.AddSeconds(30), TestContext.Current.CancellationToken);

        // Assert — same state, same window, same canaries.
        var throttle = await GetThrottle();
        Assert.NotNull(throttle);
        Assert.Equal(NamespaceThrottleState.Open, throttle.State);
        Assert.Equal(_initialWindow, throttle.CurrentWindow);
        Assert.Equal(
            tripped.Canaries.Select(c => c.WorkflowId).Order(),
            throttle.Canaries.Select(c => c.WorkflowId).Order()
        );
    }

    [Fact]
    public async Task Sweep_AllCanariesFailed_DoublesWindowAndRotatesCanaries()
    {
        // Arrange — trip, then bump every canary's requeue count: each canary retried and failed.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        for (int i = 0; i < 6; i++)
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(i));
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);
        var tripped = await GetThrottle();
        Assert.NotNull(tripped);
        var oldCanaryIds = tripped.Canaries.Select(c => c.WorkflowId).ToList();
        foreach (var canaryId in oldCanaryIds)
            await BumpStepRequeueCount(context, canaryId);

        // Act
        var secondSweep = now.AddSeconds(30);
        await service.RunSweepCycle(secondSweep, TestContext.Current.CancellationToken);

        // Assert — window doubled, canaries rotated: fresh ones promoted (and unparked), old ones parked.
        var throttle = await GetThrottle();
        Assert.NotNull(throttle);
        Assert.Equal(NamespaceThrottleState.Open, throttle.State);
        Assert.Equal(_initialWindow * 2, throttle.CurrentWindow);

        var newCanaryIds = throttle.Canaries.Select(c => c.WorkflowId).ToList();
        Assert.Equal(2, newCanaryIds.Count);
        Assert.Empty(newCanaryIds.Intersect(oldCanaryIds));

        var stamps = await GetThrottledUntil();
        foreach (var newCanaryId in newCanaryIds)
            Assert.Null(stamps[newCanaryId]);
        foreach (var oldCanaryId in oldCanaryIds)
        {
            var stamp = stamps[oldCanaryId];
            Assert.NotNull(stamp);
            AssertWithinJitterBounds(stamp.Value, secondSweep, _initialWindow * 2);
        }
    }

    [Fact]
    public async Task Sweep_WindowExtension_CapsAtMaxWindow()
    {
        // Arrange — an Open breaker already at MaxWindow whose canaries all fail again.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        var canaryId = await InsertRequeuedWorkflow(context, repo, backoffUntil: now, stepRequeueCount: 1);
        for (int i = 0; i < 5; i++)
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddMinutes(1 + i));

        await repo.UpsertNamespaceThrottle(
            new NamespaceThrottle
            {
                Namespace = Ns,
                State = NamespaceThrottleState.Open,
                TrippedAt = now.AddMinutes(-30),
                CurrentWindow = _maxWindow,
                Canaries = [new ThrottleCanary(canaryId, 1)],
                UpdatedAt = now.AddSeconds(-30),
            },
            TestContext.Current.CancellationToken
        );
        await BumpStepRequeueCount(context, canaryId);

        // Act
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);

        // Assert
        var throttle = await GetThrottle();
        Assert.NotNull(throttle);
        Assert.Equal(NamespaceThrottleState.Open, throttle.State);
        Assert.Equal(_maxWindow, throttle.CurrentWindow);
    }

    [Fact]
    public async Task Sweep_SingleProgressedCanaryAmongFailures_OpensRecovery()
    {
        // Arrange — trip with two canaries; one fails (count bumped), one completes. Quorum of
        // one: a single progressed canary opens recovery even while the other still fails.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        for (int i = 0; i < 6; i++)
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(i));
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);
        var tripped = await GetThrottle();
        Assert.NotNull(tripped);

        var failedCanary = tripped.Canaries[0].WorkflowId;
        var progressedCanary = tripped.Canaries[1].WorkflowId;
        await BumpStepRequeueCount(context, failedCanary);
        await CompleteWorkflow(context, progressedCanary);

        // Act
        var secondSweep = now.AddSeconds(30);
        await service.RunSweepCycle(secondSweep, TestContext.Current.CancellationToken);

        // Assert — recovery started and the first cohort (canary-count sized) released same-sweep.
        var throttle = await GetThrottle();
        Assert.NotNull(throttle);
        Assert.Equal(NamespaceThrottleState.HalfOpen, throttle.State);
        Assert.Equal(_initialWindow, throttle.CurrentWindow);

        var stamps = await GetThrottledUntil();
        var released = stamps
            .Where(kv => kv.Value is { } stamp && stamp >= secondSweep && stamp <= secondSweep + _sweepInterval)
            .ToList();
        Assert.Equal(2, released.Count);
    }

    // ---------------------------------------------------------------------------------------
    // Recovery: release cohorts
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task Sweep_HalfOpen_ReleasesOldestFirstInDoublingCohortsThenCloses()
    {
        // Arrange — a recovering namespace with 7 parked workflows of staggered age. The floor is
        // set high because released workflows stay Requeued in this fixture (nothing executes
        // them), which would otherwise read as a re-trip signal.
        await using var context = fixture.CreateDbContext();
        var settings = Settings(minRequeuedWorkflows: 100, canaryCount: 2);
        var repo = fixture.CreateRepository(settings);
        var (service, view) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        var parkedByAge = new List<Guid>();
        for (int i = 0; i < 7; i++)
        {
            parkedByAge.Add(
                await InsertRequeuedWorkflow(
                    context,
                    repo,
                    backoffUntil: now.AddMinutes(10),
                    workflowCreatedAt: now.AddMinutes(-60 + (i * 5)), // index 0 = oldest
                    throttledUntil: now.AddMinutes(20)
                )
            );
        }

        await repo.UpsertNamespaceThrottle(
            new NamespaceThrottle
            {
                Namespace = Ns,
                State = NamespaceThrottleState.HalfOpen,
                TrippedAt = now.AddMinutes(-10),
                CurrentWindow = TimeSpan.FromMinutes(20),
                UpdatedAt = now.AddSeconds(-30),
            },
            TestContext.Current.CancellationToken
        );

        // Act + Assert — sweep 1: cohort of 2 (canary scale), the two oldest, smeared into
        // [now, now + sweep interval]. Later sweeps advance `now` by the interval, as the real
        // loop does — a cohort's smear stamps only elapse once the interval passes.
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);
        var stamps = await GetThrottledUntil();
        AssertReleased(stamps, parkedByAge[..2], now);
        AssertStillParked(stamps, parkedByAge[2..], now);

        // Sweep 2: cohort doubles to 4 — the next four oldest.
        var secondSweep = now + _sweepInterval;
        await service.RunSweepCycle(secondSweep, TestContext.Current.CancellationToken);
        stamps = await GetThrottledUntil();
        AssertReleased(stamps, parkedByAge[2..6], secondSweep);
        AssertStillParked(stamps, parkedByAge[6..], secondSweep);

        // Sweep 3: only 1 of the requested 8 remains — population exhausted, breaker closes.
        var thirdSweep = secondSweep + _sweepInterval;
        await service.RunSweepCycle(thirdSweep, TestContext.Current.CancellationToken);
        stamps = await GetThrottledUntil();
        AssertReleased(stamps, parkedByAge[6..], thirdSweep);

        var throttle = await GetThrottle();
        Assert.NotNull(throttle);
        Assert.Equal(NamespaceThrottleState.Closed, throttle.State);
        Assert.Empty(view.OpenBreakers);
    }

    [Fact]
    public async Task Sweep_ReTripDuringRecovery_ReturnsToOpenKeepingGrownWindow()
    {
        // Arrange — a recovering namespace whose unparked requeued population trips the condition
        // again: released workflows kept failing. The grown window must persist.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;
        var grownWindow = TimeSpan.FromMinutes(40);

        for (int i = 0; i < 6; i++)
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(i));

        await repo.UpsertNamespaceThrottle(
            new NamespaceThrottle
            {
                Namespace = Ns,
                State = NamespaceThrottleState.HalfOpen,
                TrippedAt = now.AddMinutes(-20),
                CurrentWindow = grownWindow,
                UpdatedAt = now.AddSeconds(-30),
            },
            TestContext.Current.CancellationToken
        );

        // Act
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);

        // Assert — Open again with fresh canaries, window NOT reset to the initial 10 minutes.
        var throttle = await GetThrottle();
        Assert.NotNull(throttle);
        Assert.Equal(NamespaceThrottleState.Open, throttle.State);
        Assert.Equal(grownWindow, throttle.CurrentWindow);
        Assert.Equal(now, throttle.TrippedAt, TimeSpan.FromSeconds(1));
        Assert.Equal(2, throttle.Canaries.Count);

        var canaryIds = throttle.Canaries.Select(c => c.WorkflowId).ToHashSet();
        var stamps = await GetThrottledUntil();
        foreach (var (workflowId, stamp) in stamps)
        {
            if (canaryIds.Contains(workflowId))
            {
                Assert.Null(stamp);
            }
            else
            {
                Assert.NotNull(stamp);
                AssertWithinJitterBounds(stamp.Value, now, grownWindow);
            }
        }
    }

    // ---------------------------------------------------------------------------------------
    // Open maintenance: re-stamping
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task Sweep_OpenBreaker_RestampsRowsAboutToElapse()
    {
        // Arrange — an Open breaker with one parked row whose window elapses within the next
        // sweep interval: natural elapse is the eligibility mechanism, but an Open breaker
        // keeps re-parking.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        var canaryId = await InsertRequeuedWorkflow(context, repo, backoffUntil: now, stepRequeueCount: 1);
        var aboutToElapse = await InsertRequeuedWorkflow(
            context,
            repo,
            backoffUntil: now.AddMinutes(5),
            throttledUntil: now.AddSeconds(5)
        );
        var stillParked = await InsertRequeuedWorkflow(
            context,
            repo,
            backoffUntil: now.AddMinutes(5),
            throttledUntil: now.AddMinutes(8)
        );

        await repo.UpsertNamespaceThrottle(
            new NamespaceThrottle
            {
                Namespace = Ns,
                State = NamespaceThrottleState.Open,
                TrippedAt = now.AddMinutes(-2),
                CurrentWindow = _initialWindow,
                Canaries = [new ThrottleCanary(canaryId, 1)],
                UpdatedAt = now.AddSeconds(-30),
            },
            TestContext.Current.CancellationToken
        );

        // Act
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);

        // Assert — the soon-elapsing stamp was pushed a full window out; the comfortably parked
        // row was left alone.
        var stamps = await GetThrottledUntil();
        AssertWithinJitterBounds(stamps[aboutToElapse]!.Value, now, _initialWindow);
        Assert.Equal(now.AddMinutes(8), stamps[stillParked]!.Value, TimeSpan.FromSeconds(1));
    }

    // ---------------------------------------------------------------------------------------
    // Closed: grace period
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task Sweep_ClosedBreaker_ClearsStragglersAndDeletesRowAfterGrace()
    {
        // Arrange — a closed breaker and one straggler parked by a hypothetical stale snapshot.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var closedAt = DateTimeOffset.UtcNow;

        var straggler = await InsertRequeuedWorkflow(
            context,
            repo,
            backoffUntil: closedAt.AddMinutes(5),
            throttledUntil: closedAt.AddMinutes(30)
        );

        await repo.UpsertNamespaceThrottle(
            new NamespaceThrottle
            {
                Namespace = Ns,
                State = NamespaceThrottleState.Closed,
                TrippedAt = closedAt.AddMinutes(-30),
                CurrentWindow = _initialWindow,
                UpdatedAt = closedAt,
            },
            TestContext.Current.CancellationToken
        );

        var grace = NamespaceThrottleService.ClosedGraceSweepMultiplier * _sweepInterval;

        // Act + Assert — within grace: stragglers cleared, row kept.
        await service.RunSweepCycle(closedAt.AddSeconds(30), TestContext.Current.CancellationToken);
        var stamps = await GetThrottledUntil();
        Assert.Null(stamps[straggler]);
        Assert.NotNull(await GetThrottle());

        // After grace: row deleted.
        await service.RunSweepCycle(closedAt + grace, TestContext.Current.CancellationToken);
        Assert.Null(await GetThrottle());
    }

    [Fact]
    public async Task Sweep_ClosedBreakerWithTripCondition_ReTripsWithInitialWindow()
    {
        // Arrange — a closed breaker whose namespace starts failing again: detection treats it
        // like a fresh incident (initial window), unlike a failed recovery (grown window kept).
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        for (int i = 0; i < 6; i++)
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(i));

        await repo.UpsertNamespaceThrottle(
            new NamespaceThrottle
            {
                Namespace = Ns,
                State = NamespaceThrottleState.Closed,
                TrippedAt = now.AddHours(-2),
                CurrentWindow = _maxWindow,
                UpdatedAt = now.AddMinutes(-1),
            },
            TestContext.Current.CancellationToken
        );

        // Act
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);

        // Assert
        var throttle = await GetThrottle();
        Assert.NotNull(throttle);
        Assert.Equal(NamespaceThrottleState.Open, throttle.State);
        Assert.Equal(_initialWindow, throttle.CurrentWindow);
        Assert.Equal(2, throttle.Canaries.Count);
    }

    // ---------------------------------------------------------------------------------------
    // Advisory lock and kill switch
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task Sweep_LockHeldByAnotherSession_SkipsTheCycle()
    {
        // Arrange — a trip-worthy population, but another session holds the sweep lock.
        await using var context = fixture.CreateDbContext();
        var settings = Settings();
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        for (int i = 0; i < 6; i++)
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(i));

        await using var competingConnection = new NpgsqlConnection(fixture.ConnectionString);
        var competingLock = await AdvisoryLockScope.TryAcquire(
            AdvisoryLockIds.ThrottleSweep,
            competingConnection,
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(competingLock);

        // Act + Assert — the cycle is skipped, not queued.
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);
        Assert.Null(await GetThrottle());

        // Once the competitor releases, the next cycle proceeds.
        await competingLock.DisposeAsync();
        await service.RunSweepCycle(now, TestContext.Current.CancellationToken);
        Assert.NotNull(await GetThrottle());
    }

    [Fact]
    public async Task Service_ThrottlingDisabled_DoesNotRunItsLoop()
    {
        // Arrange — a trip-worthy population with the feature disabled.
        await using var context = fixture.CreateDbContext();
        var settings = Settings(enabled: false);
        var repo = fixture.CreateRepository(settings);
        var (service, _) = fixture.CreateThrottleService(settings);
        var now = DateTimeOffset.UtcNow;

        for (int i = 0; i < 6; i++)
            await InsertRequeuedWorkflow(context, repo, backoffUntil: now.AddSeconds(i));

        // Act — start the hosted service for real; disabled means its execute task completes
        // immediately instead of entering the sweep loop.
        await service.StartAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(service.ExecuteTask);
        await service.ExecuteTask.WaitAsync(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken);

        // Assert
        Assert.True(service.ExecuteTask.IsCompletedSuccessfully);
        Assert.Null(await GetThrottle());
        await service.StopAsync(TestContext.Current.CancellationToken);
    }

    // ---------------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------------

    /// <summary>
    /// Inserts a workflow in <see cref="PersistentItemStatus.Requeued"/> whose single step mirrors
    /// the invariant state the handler leaves behind: step Requeued with the given requeue count,
    /// optional per-step retry strategy, and controllable timestamps.
    /// </summary>
    private async Task<Guid> InsertRequeuedWorkflow(
        EngineDbContext context,
        IEngineRepository repo,
        DateTimeOffset? backoffUntil = null,
        int stepRequeueCount = 1,
        RetryStrategy? retryStrategy = null,
        DateTimeOffset? stepCreatedAt = null,
        DateTimeOffset? workflowCreatedAt = null,
        DateTimeOffset? throttledUntil = null
    )
    {
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Requeued,
            ns: Ns
        );

        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE engine.workflows
            SET backoff_until = {backoffUntil},
                created_at = COALESCE({workflowCreatedAt}, created_at),
                throttled_until = {throttledUntil}
            WHERE id = {workflow.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        var retryStrategyJson = retryStrategy is null
            ? null
            : JsonSerializer.Serialize(retryStrategy, JsonOptions.Default);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE engine.steps
            SET status = {(int)PersistentItemStatus.Requeued},
                requeue_count = {stepRequeueCount},
                retry_strategy_json = {retryStrategyJson}::jsonb,
                created_at = COALESCE({stepCreatedAt}, created_at)
            WHERE job_id = {workflow.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        return workflow.DatabaseId;
    }

    private static async Task BumpStepRequeueCount(EngineDbContext context, Guid workflowId) =>
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.steps SET requeue_count = requeue_count + 1 WHERE job_id = {workflowId}",
            TestContext.Current.CancellationToken
        );

    private static async Task CompleteWorkflow(EngineDbContext context, Guid workflowId)
    {
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE engine.workflows
            SET status = {(int)PersistentItemStatus.Completed}, lease_token = NULL
            WHERE id = {workflowId}
            """,
            TestContext.Current.CancellationToken
        );
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.steps SET status = {(int)PersistentItemStatus.Completed} WHERE job_id = {workflowId}",
            TestContext.Current.CancellationToken
        );
    }

    private async Task<NamespaceThrottle?> GetThrottle()
    {
        await using var context = fixture.CreateDbContext();
        var entity = await context
            .NamespaceThrottles.AsNoTracking()
            .SingleOrDefaultAsync(t => t.Namespace == Ns, TestContext.Current.CancellationToken);
        return entity?.ToDomainModel();
    }

    private async Task<Dictionary<Guid, DateTimeOffset?>> GetThrottledUntil()
    {
        await using var context = fixture.CreateDbContext();
        return await context
            .Workflows.AsNoTracking()
            .Where(w => w.Namespace == Ns)
            .ToDictionaryAsync(w => w.Id, w => w.ThrottledUntil, TestContext.Current.CancellationToken);
    }

    /// <summary>
    /// Asserts a park stamp lies within the ±20% jitter bounds of <c>now + window</c>.
    /// </summary>
    private static void AssertWithinJitterBounds(DateTimeOffset stamp, DateTimeOffset now, TimeSpan window)
    {
        var tolerance = TimeSpan.FromSeconds(1);
        Assert.InRange(
            stamp,
            now + (window * (1 - ThrottlingSettings.JitterFraction)) - tolerance,
            now + (window * (1 + ThrottlingSettings.JitterFraction)) + tolerance
        );
    }

    /// <summary>
    /// Asserts the given workflows carry a release smear stamp: within one sweep interval of the
    /// release, never a NULL-clear.
    /// </summary>
    private static void AssertReleased(
        Dictionary<Guid, DateTimeOffset?> stamps,
        IEnumerable<Guid> workflowIds,
        DateTimeOffset releasedAt
    )
    {
        foreach (var workflowId in workflowIds)
        {
            var stamp = stamps[workflowId];
            Assert.NotNull(stamp);
            Assert.InRange(stamp.Value, releasedAt, releasedAt + _sweepInterval);
        }
    }

    private static void AssertStillParked(
        Dictionary<Guid, DateTimeOffset?> stamps,
        IEnumerable<Guid> workflowIds,
        DateTimeOffset now
    )
    {
        foreach (var workflowId in workflowIds)
        {
            var stamp = stamps[workflowId];
            Assert.NotNull(stamp);
            Assert.True(stamp.Value > now + _sweepInterval, $"expected {workflowId} to still be parked");
        }
    }
}
