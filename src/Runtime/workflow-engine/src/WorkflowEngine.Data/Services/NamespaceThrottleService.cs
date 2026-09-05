using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

// CA5394: Random is an insecure random number generator — the jitter here spreads scheduling
// stamps, it is not security-sensitive (same justification as the retry delay jitter).
#pragma warning disable CA5394

namespace WorkflowEngine.Data.Services;

/// <summary>
/// The namespace throttle sweep: the failure-storm circuit breaker's single decision maker
/// (see the failure-throttling ADR). Runs detect → throttle → probe → release every
/// <see cref="ThrottlingSettings.SweepInterval"/>, with the whole cycle under the
/// <see cref="AdvisoryLockIds.ThrottleSweep"/> advisory lock so exactly one replica narrates the
/// state machine; a replica that finds the lock held skips its cycle. The sweep is the only
/// writer of <c>engine.namespace_throttles</c> and of throttle state in general — workflow
/// handlers only ever read the <see cref="IThrottleStateView"/> snapshot, which every replica
/// (lock holder or not) refreshes once per cycle.
/// <para>
/// With <see cref="ThrottlingSettings.Enabled"/> off the service exits before entering its loop:
/// disabled means inert, and the matching fetch-query variant (selected at startup in
/// <see cref="EngineRepository"/>) ignores <c>throttled_until</c> entirely.
/// </para>
/// <para>
/// The service doubles as the <see cref="INamespaceThrottleOperator"/> so the manual override
/// endpoints reuse the sweep's own trip/clear logic. Overrides acquire the same advisory lock
/// (blocking rather than try-only) before mutating state, which both serializes them against a
/// running sweep cycle across replicas and — because every mutation of the in-memory
/// <see cref="_releaseCohortSizes"/> happens while holding that lock — makes the dictionary
/// single-threaded in practice.
/// </para>
/// </summary>
internal sealed class NamespaceThrottleService(
    ILogger<NamespaceThrottleService> logger,
    TimeProvider timeProvider,
    NpgsqlDataSource dataSource,
    IOptions<EngineSettings> options,
    IEngineRepository repository,
    ThrottleStateView stateView
) : BackgroundService, INamespaceThrottleOperator
{
    /// <summary>
    /// How long a <see cref="NamespaceThrottleState.Clear"/> row lingers before deletion,
    /// as a multiple of <see cref="ThrottlingSettings.SweepInterval"/>. A handler snapshot can be
    /// stale by one sweep interval, so a workflow may still be parked into a just-cleared
    /// namespace; during the grace window the sweep clears such stragglers. One interval would
    /// be the theoretical minimum — five buys margin for a slow replica or a sweep cycle that
    /// overruns, and exceeds <see cref="ThrottleStateView.StaleSnapshotSweepMultiplier"/> so even
    /// a stamp from a maximally-stale snapshot lands inside the grace window. Costs only a tiny
    /// row lingering. A named constant rather than
    /// configuration for the same reason as the growth factors: it composes with
    /// <see cref="ThrottlingSettings.SweepInterval"/> multiplicatively.
    /// </summary>
    internal const int ClearGraceSweepMultiplier = 5;

    /// <summary>
    /// Rows per park batch: candidates are loaded and stamped in chunks so a 100k-workflow storm
    /// does not materialize in memory at once.
    /// </summary>
    internal const int ParkBatchSize = 1000;

    /// <summary>
    /// Backoff strategy used when a sweep cycle fails. Exponential from 1s up to 2min —
    /// the <see cref="DbMaintenanceService"/> shape.
    /// </summary>
    private static readonly RetryStrategy _databaseBackoff = RetryStrategy.Exponential(
        baseInterval: TimeSpan.FromSeconds(1),
        maxDelay: TimeSpan.FromMinutes(2)
    );

    /// <summary>
    /// Release cohort size per namespace currently in recovery. Deliberately in-memory: the
    /// persisted schema carries no cohort field, and losing this (restart, lock moving to another
    /// replica) merely restarts the cohort at <see cref="ThrottlingSettings.CanaryCount"/> and
    /// doubles from there — a few extra sweeps of caution, never a correctness issue.
    /// </summary>
    private readonly Dictionary<string, int> _releaseCohortSizes = new(StringComparer.Ordinal);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Throttling.Enabled)
        {
            logger.ThrottlingDisabled();
            return;
        }

        logger.StartingUp();

        int consecutiveFailures = 0;

        while (!stoppingToken.IsCancellationRequested)
        {
            using var activity = Metrics.Source.StartActivity("NamespaceThrottleService.Sweep");
            activity?.DontRecord();

            try
            {
                await RunSweepCycle(timeProvider.GetUtcNow(), stoppingToken);
                consecutiveFailures = 0;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                consecutiveFailures++;
                Metrics.Errors.Add(1, ("operation", "throttleSweep"));
                activity?.Errored(ex);

                var backoff = _databaseBackoff.CalculateDelay(consecutiveFailures);
                logger.SweepFailed(consecutiveFailures, backoff, ex.Message, ex);

                await Task.Delay(backoff, timeProvider, stoppingToken);
                continue;
            }

            await Task.Delay(options.Value.Throttling.SweepInterval, timeProvider, stoppingToken);
        }

        logger.ShuttingDown();
    }

    /// <summary>
    /// One full sweep cycle. Internal so tests drive cycles deterministically with an explicit
    /// <paramref name="now"/> instead of racing the loop's timer.
    /// </summary>
    internal async Task RunSweepCycle(DateTimeOffset now, CancellationToken ct)
    {
        // The advisory lock is session-scoped, so this connection stays open for the whole cycle.
        // The state-machine queries below run on their own pooled connections — the lock is pure
        // mutual exclusion, not a transaction boundary.
        await using var lockConnection = await dataSource.OpenConnectionAsync(ct);
        await using var sweepLock = await AdvisoryLockScope.TryAcquire(
            AdvisoryLockIds.ThrottleSweep,
            lockConnection,
            ct
        );

        // Read after the acquisition attempt, never before it: TryAcquire only tells this replica
        // the lock is free *now*, so a row read earlier can already have been advanced by the
        // replica that just released it — and the state machine would then Upsert its stale state
        // (window, canaries) over the newer one. Reading here also serves the non-holder, since
        // every replica refreshes its handler-facing snapshot each cycle, lock holder or not.
        var throttles = await repository.GetNamespaceThrottles(ct);
        PublishSnapshot(throttles);

        if (sweepLock is null)
        {
            logger.SweepSkippedLockHeld();
            return;
        }

        var counts = await repository.GetNamespaceWorkflowCounts(ct);
        var countsByNamespace = counts.ToDictionary(c => c.Namespace, StringComparer.Ordinal);
        var throttledNamespaces = throttles.Select(t => t.Namespace).ToHashSet(StringComparer.Ordinal);

        // Detect: namespaces without a state row trip on the raw population counts.
        foreach (var namespaceCounts in counts)
        {
            if (!throttledNamespaces.Contains(namespaceCounts.Namespace) && IsTripCondition(namespaceCounts))
            {
                await Trip(namespaceCounts, options.Value.Throttling.InitialWindow, now, ct);
            }
        }

        // Advance every existing breaker through the state machine.
        foreach (var throttle in throttles)
        {
            var namespaceCounts =
                countsByNamespace.GetValueOrDefault(throttle.Namespace)
                ?? new NamespaceWorkflowCounts(throttle.Namespace, Requeued: 0, Active: 0);

            switch (throttle.State)
            {
                case NamespaceThrottleState.Tripped:
                    await EvaluateTripped(throttle, namespaceCounts, now, ct);
                    break;
                case NamespaceThrottleState.Recovering:
                    await EvaluateRecovering(throttle, namespaceCounts, now, ct);
                    break;
                case NamespaceThrottleState.Clear:
                    await EvaluateClear(throttle, namespaceCounts, now, ct);
                    break;
            }
        }

        // Publish the post-mutation state so the lock holder's own snapshot is not a cycle stale.
        await RefreshSnapshot(ct);
    }

    /// <inheritdoc/>
    public async Task<ThrottleForceTripResult> ForceTrip(string ns, CancellationToken cancellationToken)
    {
        if (!options.Value.Throttling.Enabled)
            return new ThrottleForceTripResult.ThrottlingDisabled();

        // Blocking acquisition: an operator's override waits for a running sweep cycle to finish
        // instead of skipping (the sweep's try-only rule exists because its cycles are redundant
        // back-to-back — an override is not).
        await using var lockConnection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var overrideLock = await AdvisoryLockScope.Acquire(
            AdvisoryLockIds.ThrottleSweep,
            lockConnection,
            cancellationToken
        );

        var now = timeProvider.GetUtcNow();
        var counts =
            (await repository.GetNamespaceWorkflowCounts(cancellationToken)).FirstOrDefault(c => c.Namespace == ns)
            ?? new NamespaceWorkflowCounts(ns, Requeued: 0, Active: 0);

        var (throttle, parked) = await Trip(counts, options.Value.Throttling.InitialWindow, now, cancellationToken);

        logger.ThrottleForceTripped(ns, parked);

        // Publish immediately so this replica's handler cooperates right away; other replicas
        // pick the open breaker up on their next snapshot refresh, as after any sweep mutation.
        await RefreshSnapshot(cancellationToken);

        return new ThrottleForceTripResult.Tripped(throttle, parked);
    }

    /// <inheritdoc/>
    public async Task<ThrottleForceClearResult> ForceClear(string ns, CancellationToken cancellationToken)
    {
        if (!options.Value.Throttling.Enabled)
            return new ThrottleForceClearResult.ThrottlingDisabled();

        await using var lockConnection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var overrideLock = await AdvisoryLockScope.Acquire(
            AdvisoryLockIds.ThrottleSweep,
            lockConnection,
            cancellationToken
        );

        var throttle = (await repository.GetNamespaceThrottles(cancellationToken)).FirstOrDefault(t =>
            t.Namespace == ns
        );
        if (throttle is null)
            return new ThrottleForceClearResult.NotFound();

        // Idempotent replay: already closed, but still mop up stragglers immediately rather than
        // leaving them to the sweep's next grace-period pass.
        if (throttle.State == NamespaceThrottleState.Clear)
        {
            await repository.ClearNamespaceThrottledUntil(ns, cancellationToken);
            return new ThrottleForceClearResult.AlreadyClear(throttle);
        }

        var now = timeProvider.GetUtcNow();
        throttle.State = NamespaceThrottleState.Clear;
        throttle.Canaries = [];
        throttle.LastEvaluatedAt = now;
        throttle.UpdatedAt = now; // the grace anchor — the row lingers Clear from here
        await repository.UpsertNamespaceThrottle(throttle, cancellationToken);
        _releaseCohortSizes.Remove(ns);

        var cleared = await repository.ClearNamespaceThrottledUntil(ns, cancellationToken);

        Metrics.ThrottleCleared.Add(1, ("namespace", ns));
        logger.ThrottleForceCleared(ns, cleared);

        await RefreshSnapshot(cancellationToken);

        return new ThrottleForceClearResult.Cleared(throttle, cleared);
    }

    private bool IsTripCondition(NamespaceWorkflowCounts counts)
    {
        var settings = options.Value.Throttling;
        return counts.Requeued >= settings.MinRequeuedWorkflows
            && counts.Requeued >= settings.MinRequeuedRatio * counts.Active;
    }

    /// <summary>
    /// Trips the breaker for a namespace: state <see cref="NamespaceThrottleState.Tripped"/> with the
    /// given window, fresh canaries on the normal retry schedule, everything else parked.
    /// Used for first trips (initial window), re-trips from <see cref="NamespaceThrottleState.Clear"/>
    /// (initial window — the grace period judged the incident over), re-trips from failed
    /// recovery (the grown window persists), and operator force-trips (initial window). Returns
    /// the written state row and the number of workflows parked.
    /// </summary>
    private async Task<(NamespaceThrottle Throttle, int ParkedCount)> Trip(
        NamespaceWorkflowCounts counts,
        TimeSpan window,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var settings = options.Value.Throttling;
        var canaries = await repository.SelectThrottleCanaries(counts.Namespace, settings.CanaryCount, [], ct);

        var throttle = new NamespaceThrottle
        {
            Namespace = counts.Namespace,
            State = NamespaceThrottleState.Tripped,
            TrippedAt = now,
            CurrentWindow = window,
            Canaries = canaries,
            LastEvaluatedAt = now,
            LastRequeuedCount = counts.Requeued,
            LastActiveCount = counts.Active,
            UpdatedAt = now,
        };
        await repository.UpsertNamespaceThrottle(throttle, ct);
        _releaseCohortSizes.Remove(counts.Namespace);

        var parked = await Park(counts.Namespace, canaries, window, now, ct);

        Metrics.ThrottleTripped.Add(1, ("namespace", counts.Namespace));
        logger.ThrottleTripped(counts.Namespace, counts.Requeued, counts.Active, window, parked);

        return (throttle, parked);
    }

    /// <summary>
    /// A tripped breaker probes its canaries: any progressed canary opens recovery (quorum of one —
    /// premature release self-corrects by re-tripping, while requiring unanimity would let one
    /// idiosyncratically-broken workflow block recovery forever); unanimous failure extends the
    /// window and rotates the canaries; otherwise — including a canary observed mid-attempt,
    /// which proves nothing about the target — the breaker keeps waiting. In all cases the
    /// sweep re-parks stragglers and re-stamps rows whose window is about to elapse — natural
    /// elapse is the eligibility mechanism, but a tripped breaker keeps re-parking.
    /// </summary>
    private async Task EvaluateTripped(
        NamespaceThrottle throttle,
        NamespaceWorkflowCounts counts,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var settings = options.Value.Throttling;
        var observations = await repository.GetThrottleCanaryObservations(
            [.. throttle.Canaries.Select(c => c.WorkflowId)],
            ct
        );
        var observationsById = observations.ToDictionary(o => o.WorkflowId);

        // Judged by comparing requeue counts recorded at selection — never by timing. A canary
        // that vanished (e.g. deleted) counts as progressed: it is gone, it cannot hammer.
        bool anyProgressed = throttle.Canaries.Count == 0;
        bool allFailed = throttle.Canaries.Count > 0;
        foreach (var canary in throttle.Canaries)
        {
            if (!observationsById.TryGetValue(canary.WorkflowId, out var observation))
            {
                anyProgressed = true;
                continue;
            }

            // A currently-executing canary is neither: being leased proves nothing about the
            // target — in a hang-until-timeout storm an in-flight probe is the failure mode's
            // signature, and treating it as progress would release cohorts into a hanging target
            // that cannot feed the re-trip signal until its attempts time out. The verdict waits
            // for the attempt to record its result.
            bool failed = observation.RequeueCount > canary.RequeueCount;
            bool progressed =
                !failed
                && observation.Status != PersistentItemStatus.Requeued
                && observation.Status != PersistentItemStatus.Processing;

            anyProgressed |= progressed;
            allFailed &= failed;
        }

        if (anyProgressed)
        {
            throttle.State = NamespaceThrottleState.Recovering;
            _releaseCohortSizes[throttle.Namespace] = settings.CanaryCount;
            logger.ThrottleRecoveryStarted(throttle.Namespace, throttle.CurrentWindow);

            // Recovery starts this sweep — the canaries already proved capacity, so the first
            // cohort should not wait out another interval.
            await EvaluateRecovering(throttle, counts, now, ct);
            return;
        }

        if (allFailed)
        {
            var extendedWindow = Extend(throttle.CurrentWindow, settings.MaxWindow);
            throttle.CurrentWindow = extendedWindow;

            // Rotate: park the old canaries (they rejoin the pool below, no longer excluded) and
            // promote fresh ones — a poison canary costs at most one window cycle.
            var freshCanaries = await repository.SelectThrottleCanaries(
                throttle.Namespace,
                settings.CanaryCount,
                [.. throttle.Canaries.Select(c => c.WorkflowId)],
                ct
            );
            throttle.Canaries = freshCanaries;

            var parked = await Park(throttle.Namespace, freshCanaries, extendedWindow, now, ct);

            Metrics.ThrottleExtended.Add(1, ("namespace", throttle.Namespace));
            logger.ThrottleExtended(throttle.Namespace, extendedWindow, parked);
        }
        else
        {
            // Mixed / no signal yet: keep waiting, keep the horde parked.
            await Park(throttle.Namespace, throttle.Canaries, throttle.CurrentWindow, now, ct);
        }

        Stamp(throttle, counts, now);
        await repository.UpsertNamespaceThrottle(throttle, ct);
    }

    /// <summary>
    /// A recovering breaker first re-evaluates the trip condition over the <em>unparked</em>
    /// population (parked rows are still <c>Requeued</c>; counting them would re-trip instantly
    /// and recovery could never proceed) and re-trips keeping the grown window if it fires.
    /// Otherwise it releases the next cohort oldest-first with a jittered smear, doubling the
    /// cohort each sweep, and closes once a cohort comes back empty.
    /// </summary>
    private async Task EvaluateRecovering(
        NamespaceThrottle throttle,
        NamespaceWorkflowCounts counts,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var settings = options.Value.Throttling;
        var unparked = await repository.GetUnparkedNamespaceWorkflowCounts(throttle.Namespace, now, ct);

        if (IsTripCondition(unparked))
        {
            // Failed recovery: back to Tripped. The window memory persists — this is what makes
            // repeated failed recoveries progressively more patient.
            throttle.State = NamespaceThrottleState.Tripped;
            throttle.TrippedAt = now;
            throttle.Canaries = await repository.SelectThrottleCanaries(
                throttle.Namespace,
                settings.CanaryCount,
                [],
                ct
            );
            _releaseCohortSizes.Remove(throttle.Namespace);

            var parked = await Park(throttle.Namespace, throttle.Canaries, throttle.CurrentWindow, now, ct);

            Metrics.ThrottleTripped.Add(1, ("namespace", throttle.Namespace));
            logger.ThrottleReTripped(
                throttle.Namespace,
                unparked.Requeued,
                unparked.Active,
                throttle.CurrentWindow,
                parked
            );

            Stamp(throttle, counts, now);
            await repository.UpsertNamespaceThrottle(throttle, ct);
            return;
        }

        var cohortSize = _releaseCohortSizes.GetValueOrDefault(throttle.Namespace, settings.CanaryCount);
        var released = await repository.ReleaseThrottledCohort(
            throttle.Namespace,
            cohortSize,
            now,
            smear: settings.SweepInterval,
            ct
        );

        if (released > 0)
        {
            Metrics.ThrottleCohortReleased.Add(released, ("namespace", throttle.Namespace));
            logger.ThrottleCohortReleased(throttle.Namespace, released, cohortSize);
        }

        _releaseCohortSizes[throttle.Namespace] = (int)
            Math.Min(int.MaxValue, cohortSize * ThrottlingSettings.ReleaseCohortGrowthFactor);

        if (released == 0)
        {
            // Nothing left to release and the trip condition is quiet: the incident is over.
            // An empty cohort, not merely a short one: the cohort is claimed FOR UPDATE SKIP
            // LOCKED, so a single row held by a concurrent cancellation or fetch shortens it
            // while parked rows remain — and clearing early is not free, because a re-trip out
            // of Clear starts over at InitialWindow and loses the grown window. The cost is one
            // extra sweep at the tail of every recovery, releasing nothing.
            // The row lingers Clear for a grace period so stragglers parked by stale handler
            // snapshots still get cleared — deleting it here would orphan them.
            throttle.State = NamespaceThrottleState.Clear;
            throttle.Canaries = [];
            _releaseCohortSizes.Remove(throttle.Namespace);

            Metrics.ThrottleCleared.Add(1, ("namespace", throttle.Namespace));
            logger.ThrottleCleared(throttle.Namespace);
        }

        Stamp(throttle, counts, now);
        await repository.UpsertNamespaceThrottle(throttle, ct);
    }

    /// <summary>
    /// A cleared breaker either re-trips like a fresh detection (raw counts, initial window), or
    /// serves out its grace period: each sweep clears straggler <c>throttled_until</c> stamps in
    /// the namespace, and once the grace elapses the row is deleted. The grace anchor is the
    /// <c>updated_at</c> written when it cleared, so cleared rows are deliberately never re-stamped.
    /// </summary>
    private async Task EvaluateClear(
        NamespaceThrottle throttle,
        NamespaceWorkflowCounts counts,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        if (IsTripCondition(counts))
        {
            await Trip(counts, options.Value.Throttling.InitialWindow, now, ct);
            return;
        }

        var cleared = await repository.ClearNamespaceThrottledUntil(throttle.Namespace, ct);
        if (cleared > 0)
            logger.ThrottleStragglersCleared(throttle.Namespace, cleared);

        var clearedAt = throttle.UpdatedAt ?? throttle.TrippedAt;
        var grace = ClearGraceSweepMultiplier * options.Value.Throttling.SweepInterval;
        if (now - clearedAt >= grace)
        {
            await repository.DeleteNamespaceThrottle(throttle.Namespace, ct);
            logger.ThrottleRowDeleted(throttle.Namespace);
        }
    }

    /// <summary>
    /// Parks the namespace's <c>Requeued</c> population (excluding the current canaries) behind
    /// <c>throttled_until = now + window</c>, jittered ±<see cref="ThrottlingSettings.JitterFraction"/>
    /// per row and clamped per stamp to the workflow's current step's retry deadline — computed
    /// with the exact anchor rule and <see cref="RetryStrategyExtensions.GetDeadline"/> the
    /// workflow handler uses, so throttling can never cost a workflow its final retry attempt
    /// within its <see cref="RetryStrategy.MaxDuration"/> budget. Also re-stamps parked rows whose
    /// window elapses within the next sweep interval. Candidates are processed in keyset-paginated
    /// batches of <see cref="ParkBatchSize"/>. Returns the number of rows stamped.
    /// </summary>
    private async Task<int> Park(
        string ns,
        IReadOnlyList<ThrottleCanary> canaries,
        TimeSpan window,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var settings = options.Value;
        var excludedIds = canaries.Select(c => c.WorkflowId).ToArray();
        var restampCutoff = now + settings.Throttling.SweepInterval;

        var totalParked = 0;
        var afterId = Guid.Empty;
        while (true)
        {
            var candidates = await repository.GetThrottleParkCandidates(
                ns,
                excludedIds,
                restampCutoff,
                afterId,
                ParkBatchSize,
                ct
            );
            if (candidates.Count == 0)
                break;

            var stamps = new List<(Guid WorkflowId, DateTimeOffset ThrottledUntil)>(candidates.Count);
            foreach (var candidate in candidates)
            {
                var strategy = candidate.RetryStrategy ?? settings.DefaultStepRetryStrategy;
                var anchor = StepExtensions.ResolveRetryAnchor(
                    candidate.LastDeferredAt,
                    candidate.PreviousStepUpdatedAt,
                    candidate.StepCreatedAt
                );
                var deadline = strategy.GetDeadline(anchor);

                // The final attempt is already due (or overdue): parking would only delay it for
                // no benefit, so this workflow is left on its normal schedule.
                if (deadline <= now)
                    continue;

                var jitterFactor = 1 + (ThrottlingSettings.JitterFraction * ((2 * Random.Shared.NextDouble()) - 1));
                var throttledUntil = now + (window * jitterFactor);
                if (throttledUntil > deadline)
                    throttledUntil = deadline;

                stamps.Add((candidate.WorkflowId, throttledUntil));
            }

            totalParked += await repository.StampThrottledUntil(stamps, ct);

            if (candidates.Count < ParkBatchSize)
                break;
            afterId = candidates[^1].WorkflowId;
        }

        if (totalParked > 0)
            logger.ThrottleParked(ns, totalParked, window);

        return totalParked;
    }

    private static TimeSpan Extend(TimeSpan currentWindow, TimeSpan maxWindow)
    {
        var grown = currentWindow * ThrottlingSettings.WindowGrowthFactor;
        return grown > maxWindow ? maxWindow : grown;
    }

    /// <summary>
    /// Records the evaluation on the state row before it is written back.
    /// </summary>
    private static void Stamp(NamespaceThrottle throttle, NamespaceWorkflowCounts counts, DateTimeOffset now)
    {
        throttle.LastEvaluatedAt = now;
        throttle.LastRequeuedCount = counts.Requeued;
        throttle.LastActiveCount = counts.Active;
        throttle.UpdatedAt = now;
    }

    /// <summary>
    /// Re-reads the state table and publishes a fresh handler-facing snapshot.
    /// </summary>
    private async Task RefreshSnapshot(CancellationToken ct)
    {
        var throttles = await repository.GetNamespaceThrottles(ct);
        PublishSnapshot(throttles);
    }

    private void PublishSnapshot(IReadOnlyList<NamespaceThrottle> throttles)
    {
        var trippedBreakers = throttles
            .Where(t => t.State == NamespaceThrottleState.Tripped)
            .ToDictionary(t => t.Namespace, t => t.CurrentWindow, StringComparer.Ordinal);

        stateView.Publish(trippedBreakers);
        Metrics.SetTrippedThrottleBreakersCount(trippedBreakers.Count);
    }
}

internal static partial class NamespaceThrottleServiceLogs
{
    [LoggerMessage(LogLevel.Information, "NamespaceThrottleService starting")]
    internal static partial void StartingUp(this ILogger<NamespaceThrottleService> logger);

    [LoggerMessage(LogLevel.Information, "NamespaceThrottleService shutting down")]
    internal static partial void ShuttingDown(this ILogger<NamespaceThrottleService> logger);

    [LoggerMessage(
        LogLevel.Debug,
        "Namespace throttling is disabled (EngineSettings.Throttling.Enabled = false); the sweep will not run"
    )]
    internal static partial void ThrottlingDisabled(this ILogger<NamespaceThrottleService> logger);

    [LoggerMessage(LogLevel.Debug, "Throttle sweep skipped: the sweep lock is held by another replica")]
    internal static partial void SweepSkippedLockHeld(this ILogger<NamespaceThrottleService> logger);

    [LoggerMessage(
        LogLevel.Error,
        "Throttle sweep failed (attempt {ConsecutiveFailures}, backing off {Backoff}): {ErrorMessage}"
    )]
    internal static partial void SweepFailed(
        this ILogger<NamespaceThrottleService> logger,
        int consecutiveFailures,
        TimeSpan backoff,
        string errorMessage,
        Exception ex
    );

    [LoggerMessage(
        LogLevel.Warning,
        "Throttle TRIPPED for namespace {Ns}: {RequeuedCount} requeued of {ActiveCount} active; "
            + "window {Window}, parked {ParkedCount} workflow(s)"
    )]
    internal static partial void ThrottleTripped(
        this ILogger<NamespaceThrottleService> logger,
        string ns,
        int requeuedCount,
        int activeCount,
        TimeSpan window,
        int parkedCount
    );

    [LoggerMessage(
        LogLevel.Warning,
        "Throttle EXTENDED for namespace {Ns}: all canaries failed; window now {Window}, "
            + "canaries rotated, re-parked {ParkedCount} workflow(s)"
    )]
    internal static partial void ThrottleExtended(
        this ILogger<NamespaceThrottleService> logger,
        string ns,
        TimeSpan window,
        int parkedCount
    );

    [LoggerMessage(
        LogLevel.Information,
        "Throttle recovery STARTED for namespace {Ns}: a canary progressed (window was {Window})"
    )]
    internal static partial void ThrottleRecoveryStarted(
        this ILogger<NamespaceThrottleService> logger,
        string ns,
        TimeSpan window
    );

    [LoggerMessage(
        LogLevel.Warning,
        "Throttle RE-TRIPPED for namespace {Ns} during recovery: {RequeuedCount} unparked requeued of "
            + "{ActiveCount} unparked active; keeping grown window {Window}, re-parked {ParkedCount} workflow(s)"
    )]
    internal static partial void ThrottleReTripped(
        this ILogger<NamespaceThrottleService> logger,
        string ns,
        int requeuedCount,
        int activeCount,
        TimeSpan window,
        int parkedCount
    );

    [LoggerMessage(
        LogLevel.Information,
        "Throttle released a recovery cohort for namespace {Ns}: {ReleasedCount} of {CohortSize} requested"
    )]
    internal static partial void ThrottleCohortReleased(
        this ILogger<NamespaceThrottleService> logger,
        string ns,
        int releasedCount,
        int cohortSize
    );

    [LoggerMessage(
        LogLevel.Information,
        "Throttle CLOSED for namespace {Ns}: parked population exhausted and the trip condition is quiet"
    )]
    internal static partial void ThrottleCleared(this ILogger<NamespaceThrottleService> logger, string ns);

    [LoggerMessage(
        LogLevel.Information,
        "Throttle cleared {ClearedCount} straggler throttled_until stamp(s) in cleared namespace {Ns}"
    )]
    internal static partial void ThrottleStragglersCleared(
        this ILogger<NamespaceThrottleService> logger,
        string ns,
        int clearedCount
    );

    [LoggerMessage(LogLevel.Information, "Throttle state row for namespace {Ns} deleted after grace period")]
    internal static partial void ThrottleRowDeleted(this ILogger<NamespaceThrottleService> logger, string ns);

    [LoggerMessage(
        LogLevel.Warning,
        "Throttle FORCE-OPENED for namespace {Ns} by operator override: parked {ParkedCount} workflow(s)"
    )]
    internal static partial void ThrottleForceTripped(
        this ILogger<NamespaceThrottleService> logger,
        string ns,
        int parkedCount
    );

    [LoggerMessage(
        LogLevel.Warning,
        "Throttle FORCE-CLOSED for namespace {Ns} by operator override: cleared {ClearedCount} throttled_until stamp(s)"
    )]
    internal static partial void ThrottleForceCleared(
        this ILogger<NamespaceThrottleService> logger,
        string ns,
        int clearedCount
    );

    [LoggerMessage(LogLevel.Debug, "Throttle parked {ParkedCount} workflow(s) in namespace {Ns} (window {Window})")]
    internal static partial void ThrottleParked(
        this ILogger<NamespaceThrottleService> logger,
        string ns,
        int parkedCount,
        TimeSpan window
    );
}
