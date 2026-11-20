using System.Diagnostics;
using System.Threading.Channels;
using Altinn.Studio.Common.Cdn;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.Sync;

/// <summary>What to sync.</summary>
public sealed record SyncOptions
{
    /// <summary>The environments, synced one after the other.</summary>
    public required IReadOnlyList<RuntimeEnvironment> Environments { get; init; }

    /// <summary>The service owners to cover, or <c>null</c> for all. Other service owners' apps are left as they are.</summary>
    public IReadOnlySet<ServiceOwnerCode>? Orgs { get; init; }

    /// <summary>Whether to only say what would change, without looking up releases or writing anything.</summary>
    public bool DryRun { get; init; }

    /// <summary>Whether to try deployments again that could not be fetched before at the same version.</summary>
    public bool RetryFailed { get; init; }

    /// <summary>How many requests to have in flight at a time.</summary>
    public int Parallelism { get; init; } = 16;
}

/// <summary>
/// Brings the store's copy of each environment in line with the apps that run there. Apps whose deployed version the
/// store already has cost no request and no write, so a sync that finds nothing changed leaves the environment's
/// folder exactly as it was.
/// </summary>
public sealed class FleetSync
{
    // A batch is committed when it has this many apps, or when an app arrives this long after the batch started, so
    // that an interrupted first sync keeps most of what it downloaded.
    private const int BatchSize = 100;
    private static readonly TimeSpan s_batchAge = TimeSpan.FromSeconds(10);

    private readonly FleetStore _store;
    private readonly HttpClient _http;
    private readonly IStudioCredentials _credentials;
    private readonly FleetTelemetry _telemetry;
    private readonly TimeProvider _time;
    private readonly FleetOptions _options;

    /// <summary>Creates a sync over a store.</summary>
    /// <param name="store">The store.</param>
    /// <param name="http">The client for every request, as <see cref="Http.FleetHttp.CreateClient"/> makes it.</param>
    /// <param name="credentials">Gives the Studio API keys.</param>
    /// <param name="telemetry">Records traces and metrics.</param>
    /// <param name="options">Where to find the services, or the defaults.</param>
    /// <param name="time">The clock, or the system's.</param>
    public FleetSync(
        FleetStore store,
        HttpClient http,
        IStudioCredentials credentials,
        FleetTelemetry telemetry,
        FleetOptions? options = null,
        TimeProvider? time = null
    )
    {
        _options = options ?? new FleetOptions();
        _store = store;
        _http = http;
        _credentials = credentials;
        _telemetry = telemetry;
        _time = time ?? TimeProvider.System;
    }

    /// <summary>Syncs each environment, and returns what it did.</summary>
    /// <exception cref="FleetException">The sync could not complete, such as when the store is locked.</exception>
    public async Task<IReadOnlyList<EnvironmentSyncResult>> Sync(
        SyncOptions options,
        ISyncObserver? observer,
        CancellationToken cancellationToken
    )
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(options.Parallelism, 1);
        using IDisposable? storeLock = options.DryRun ? null : _store.Lock();
        if (!options.DryRun)
        {
            RecoverInterruptedRuns();
        }

        var keys = new StudioKeys(_credentials);
        var discovery = new Discovery(_http, _options, options.Parallelism);
        AltinnOrgsRegistry serviceOwners = await discovery.GetServiceOwners(cancellationToken);
        var results = new List<EnvironmentSyncResult>();
        foreach (RuntimeEnvironment environment in options.Environments)
        {
            results.Add(
                await SyncEnvironment(environment, serviceOwners, discovery, keys, options, observer, cancellationToken)
            );
        }

        return results;
    }

    /// <summary>Builds an environment's index again from the files on disk, and returns how many apps it has.</summary>
    /// <exception cref="FleetException">The store is locked.</exception>
    public async Task<int> RebuildIndex(
        RuntimeEnvironment environment,
        int parallelism,
        ISyncObserver? observer,
        CancellationToken cancellationToken
    )
    {
        using IDisposable storeLock = _store.Lock();
        RecoverInterruptedRuns();
        return await IndexRebuilder.Rebuild(
            _store,
            environment,
            _telemetry.Version,
            parallelism,
            (done, total) => observer?.OnProgress(new SyncProgress(environment, SyncStage.Indexing, done, total)),
            _time,
            cancellationToken
        );
    }

    private async Task<EnvironmentSyncResult> SyncEnvironment(
        RuntimeEnvironment environment,
        AltinnOrgsRegistry serviceOwners,
        Discovery discovery,
        StudioKeys keys,
        SyncOptions options,
        ISyncObserver? observer,
        CancellationToken cancellationToken
    )
    {
        long started = Stopwatch.GetTimestamp();
        using Activity? activity = _telemetry.ActivitySource.StartActivity("fleet.sync");
        activity?.SetTag("fleet.environment", environment.Name);
        void Report(SyncStage stage, int done, int total) =>
            observer?.OnProgress(new SyncProgress(environment, stage, done, total));

        if (!options.DryRun)
        {
            await RebuildIfOutdated(environment, options.Parallelism, observer, cancellationToken);
        }

        DiscoveryResult found = await discovery.Discover(
            environment,
            serviceOwners,
            options.Orgs,
            (done, total) => Report(SyncStage.Discovering, done, total),
            cancellationToken
        );

        Dictionary<AppIdentifier, IndexedApp> indexed = [];
        Dictionary<AppIdentifier, AppFailure> recorded = [];
        using (FleetIndex? index = FleetIndex.OpenReadOnly(_store.IndexPath(environment)))
        {
            if (index is not null)
            {
                indexed = index.ReadApps();
                recorded = index.ReadFailures();
            }
        }

        SyncPlan plan = SyncPlan.Create(
            found,
            indexed,
            recorded,
            options.Orgs,
            options.RetryFailed,
            app => Directory.Exists(_store.AppPath(environment, app))
        );
        activity?.SetTag("fleet.deployed", found.Deployments.Count);
        activity?.SetTag("fleet.to_fetch", plan.ToFetch.Count);
        activity?.SetTag("fleet.to_remove", plan.ToRemove.Count);

        if (options.DryRun || plan.IsEmpty)
        {
            List<AppChange> planned =
            [
                .. plan.ToFetch.Select(f => new AppChange.ToFetch(
                    f.App,
                    f.Stored?.Release?.Version,
                    f.Deployment.Version
                )),
                .. plan.ToRemove.Select(Removed),
            ];
            if (!options.DryRun)
            {
                WriteCheckState(environment, found, plan.KnownFailures.Count);
            }

            return Result(
                environment,
                options.DryRun,
                found,
                plan,
                planned,
                plan.KnownFailures,
                [.. found.Notes],
                started
            );
        }

        Resolution resolution =
            plan.ToFetch.Count == 0
                ? new Resolution([], [], [])
                : await new ReleaseResolver(_http, keys, _options.StudioHosts, options.Parallelism, _time).Resolve(
                    [.. plan.ToFetch.Select(f => f.Deployment)],
                    (done, total) => Report(SyncStage.Resolving, done, total),
                    cancellationToken
                );

        string runFolder = _store.CreateRunFolder(environment);
        var changes = new List<AppChange>();
        var failures = new List<AppFailure>(plan.KnownFailures);
        try
        {
            using EnvironmentWriter writer = EnvironmentWriter.Open(
                _store,
                environment,
                runFolder,
                _telemetry.Version,
                _time
            );
            var toFetch = plan.ToFetch.Where(f => resolution.Releases.ContainsKey(f.App)).ToList();
            Dictionary<AppIdentifier, PlannedFetch> planned = plan.ToFetch.ToDictionary(f => f.App);
            var fetcher = new AppFetcher(_http, keys, _telemetry, _time);
            var outcomes = Channel.CreateBounded<FetchOutcome>(BatchSize);
            int fetchedCount = 0;
            Report(SyncStage.Fetching, 0, toFetch.Count);
            Task producer = Task.Run(
                async () =>
                {
                    try
                    {
                        await Parallel.ForEachAsync(
                            toFetch,
                            new ParallelOptions
                            {
                                MaxDegreeOfParallelism = options.Parallelism,
                                CancellationToken = cancellationToken,
                            },
                            async (fetch, token) =>
                            {
                                string staging = Path.Join(
                                    runFolder,
                                    "stage",
                                    fetch.App.Org.Value,
                                    fetch.App.App.Value
                                );
                                FetchOutcome outcome = await fetcher.Fetch(
                                    fetch.Deployment,
                                    resolution.Releases[fetch.App],
                                    staging,
                                    token
                                );
                                await outcomes.Writer.WriteAsync(outcome, token);
                                Report(SyncStage.Fetching, Interlocked.Increment(ref fetchedCount), toFetch.Count);
                            }
                        );
                        outcomes.Writer.Complete();
                    }
                    catch (Exception ex)
                    {
                        outcomes.Writer.Complete(ex);
                    }
                },
                CancellationToken.None
            );

            // The commits ignore cancellation, so that what was downloaded before an interruption is kept.
            var batch = new List<StagedApp>();
            var batchFailures = new List<AppFailure>();
            long batchStarted = Stopwatch.GetTimestamp();
            void CommitBatch(IReadOnlyList<AppIdentifier> removes, IReadOnlyCollection<AppIdentifier> cleared)
            {
                // A failure that repeats stays as the index has it, so that an app that keeps failing does not
                // change the environment's folder on every sync.
                AppFailure[] newFailures = [.. batchFailures.Where(f => !IsRecorded(recorded, f))];
                writer.Commit(batch, removes, newFailures, cleared);
                changes.AddRange(batch.Select(s => Fetched(planned[s.App], s)));
                failures.AddRange(batchFailures);
                batch.Clear();
                batchFailures.Clear();
                batchStarted = Stopwatch.GetTimestamp();
            }

            try
            {
                await foreach (FetchOutcome outcome in outcomes.Reader.ReadAllAsync(CancellationToken.None))
                {
                    switch (outcome)
                    {
                        case FetchOutcome.Fetched fetched:
                            batch.Add(fetched.App);
                            break;
                        case FetchOutcome.Failed failed:
                            batchFailures.Add(failed.Failure);
                            break;
                    }

                    if (batch.Count >= BatchSize || Stopwatch.GetElapsedTime(batchStarted) >= s_batchAge)
                    {
                        CommitBatch([], []);
                    }
                }
            }
            finally
            {
                if (batch.Count > 0 || batchFailures.Count > 0)
                {
                    CommitBatch([], []);
                }
            }

            await producer;

            batchFailures.AddRange(resolution.Failures.Values);
            CommitBatch([.. plan.ToRemove.Select(r => r.App)], plan.ClearedFailures);
            changes.AddRange(plan.ToRemove.Select(Removed));
            if (writer.Changed)
            {
                Readme.Write(_store, environment, writer.Index);
            }
        }
        finally
        {
            // A commit that failed midway leaves its journal, and the next run needs the staged folders to finish it.
            if (!File.Exists(_store.JournalPath(environment)))
            {
                Directory.Delete(runFolder, recursive: true);
            }
        }

        foreach (string note in resolution.Notes)
        {
            activity?.AddEvent(new ActivityEvent(note));
        }

        WriteCheckState(environment, found, failures.Count);
        changes.Sort((x, y) => SyncPlan.Compare(x.App, y.App));
        return Result(
            environment,
            false,
            found,
            plan,
            changes,
            failures,
            [.. found.Notes, .. resolution.Notes],
            started
        );
    }

    private async Task RebuildIfOutdated(
        RuntimeEnvironment environment,
        int parallelism,
        ISyncObserver? observer,
        CancellationToken cancellationToken
    )
    {
        string indexPath = _store.IndexPath(environment);
        bool outdated;
        if (File.Exists(indexPath))
        {
            using FleetIndex? index = FleetIndex.OpenReadOnly(indexPath);
            outdated = index?.ReadSchemaVersion() is not FleetIndex.SchemaVersion;
        }
        else
        {
            outdated = IndexRebuilder.ListApps(_store.AppsPath(environment)).Count > 0;
        }

        if (outdated)
        {
            await IndexRebuilder.Rebuild(
                _store,
                environment,
                _telemetry.Version,
                parallelism,
                (done, total) => observer?.OnProgress(new SyncProgress(environment, SyncStage.Indexing, done, total)),
                _time,
                cancellationToken
            );
        }
    }

    // Finishes what interrupted runs left, then clears their temporary files. Needs the lock.
    private void RecoverInterruptedRuns()
    {
        if (Directory.Exists(_store.BookkeepingPath))
        {
            foreach (string journal in Directory.EnumerateFiles(_store.BookkeepingPath, "*.journal.json"))
            {
                string name = Path.GetFileName(journal)[..^".journal.json".Length];
                if (RuntimeEnvironment.TryParse(name, out RuntimeEnvironment environment))
                {
                    EnvironmentWriter.Recover(_store, environment, _telemetry.Version, _time);
                }
            }
        }

        if (Directory.Exists(_store.Root))
        {
            foreach (string folder in Directory.EnumerateDirectories(_store.Root))
            {
                // A transaction that was cut off leaves a journal beside the index, which only a writer can roll back.
                if (
                    RuntimeEnvironment.TryParse(Path.GetFileName(folder), out RuntimeEnvironment environment)
                    && File.Exists(_store.IndexPath(environment) + "-journal")
                )
                {
                    FleetIndex.OpenReadWrite(_store.IndexPath(environment), environment, _telemetry.Version).Dispose();
                }
            }
        }

        _store.ClearTemp();
    }

    private void WriteCheckState(RuntimeEnvironment environment, DiscoveryResult found, int failed) =>
        _store.WriteCheckState(
            environment,
            new CheckState(_time.GetUtcNow(), found.Deployments.Count, failed, found.Failures)
        );

    private EnvironmentSyncResult Result(
        RuntimeEnvironment environment,
        bool dryRun,
        DiscoveryResult found,
        SyncPlan plan,
        List<AppChange> changes,
        List<AppFailure> failures,
        List<string> notes,
        long started
    )
    {
        TimeSpan duration = Stopwatch.GetElapsedTime(started);
        _telemetry.SyncDuration.Record(
            duration.TotalSeconds,
            new KeyValuePair<string, object?>("fleet.environment", environment.Name)
        );
        failures.Sort((x, y) => SyncPlan.Compare(x.App, y.App));
        return new EnvironmentSyncResult(
            environment,
            dryRun,
            found.Deployments.Count,
            plan.Unchanged,
            changes,
            failures,
            found.Failures,
            notes,
            duration
        );
    }

    private static bool IsRecorded(Dictionary<AppIdentifier, AppFailure> recorded, AppFailure failure) =>
        recorded.TryGetValue(failure.App, out AppFailure? known)
        && known.Version == failure.Version
        && known.Kind == failure.Kind
        && known.Reason == failure.Reason;

    private static AppChange Fetched(PlannedFetch planned, StagedApp staged) =>
        planned.Stored is null
            ? new AppChange.Added(staged.App, staged.Release.Version, staged.Release.Commit, staged.Files.Skipped)
            : new AppChange.Updated(
                staged.App,
                planned.Stored.Release?.Version,
                staged.Release.Version,
                staged.Release.Commit,
                staged.Files.Skipped
            );

    private static AppChange Removed(IndexedApp removed) =>
        new AppChange.Removed(removed.App, removed.Release?.Version);
}
