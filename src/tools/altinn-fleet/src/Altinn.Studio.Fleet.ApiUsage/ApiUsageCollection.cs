using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.ApiUsage;

/// <summary>Analyzes one app's folder. The folder is a copy, which the analysis may change.</summary>
internal interface IAppAnalyzer
{
    Task<AppUsage> Analyze(string appDir, CancellationToken cancellationToken);
}

/// <summary>What <see cref="ApiUsageCollection.Collect"/> does.</summary>
internal sealed record CollectOptions
{
    public required IReadOnlyList<RuntimeEnvironment> Environments { get; init; }

    /// <summary>Only these service owners, or all when <c>null</c>.</summary>
    public IReadOnlySet<ServiceOwnerCode>? Orgs { get; init; }

    /// <summary>How many apps to analyze at a time. Each is a build, so this is bounded by memory and cores.</summary>
    public int Parallelism { get; init; } = 4;

    /// <summary>Analyze every app, also those already analyzed at their deployed version.</summary>
    public bool Force { get; init; }

    /// <summary>Where to copy the apps while they are analyzed. A temporary folder when <c>null</c>.</summary>
    public string? WorkFolder { get; init; }
}

/// <summary>What a collection did in an environment.</summary>
internal sealed record CollectResult(
    RuntimeEnvironment Environment,
    int Apps,
    int Analyzed,
    int Unchanged,
    int Failed,
    int Removed
);

/// <summary>
/// Analyzes the apps in a store's environments and records what they use of the app library. An app already analyzed
/// at its deployed version is skipped, unless the analysis failed, so a run after a sync only builds what changed.
/// </summary>
/// <remarks>
/// The store's app folders are never changed: a build writes into the project's folder, and the store may be a
/// read-only copy. Each app is copied to a work folder first.
/// </remarks>
internal sealed class ApiUsageCollection(FleetStore store, UsageDatabase database, IAppAnalyzer analyzer)
{
    private readonly Lock _databaseGate = new();

    public async Task<List<CollectResult>> Collect(
        CollectOptions options,
        ISyncObserver? observer,
        CancellationToken cancellationToken
    )
    {
        string workFolder = options.WorkFolder ?? Path.Join(Path.GetTempPath(), $"fleet-api-usage-{Guid.NewGuid():N}");
        try
        {
            var results = new List<CollectResult>();
            foreach (RuntimeEnvironment environment in options.Environments)
            {
                results.Add(await Collect(environment, options, workFolder, observer, cancellationToken));
            }

            return results;
        }
        finally
        {
            if (options.WorkFolder is null && Directory.Exists(workFolder))
            {
                Directory.Delete(workFolder, recursive: true);
            }
        }
    }

    private async Task<CollectResult> Collect(
        RuntimeEnvironment environment,
        CollectOptions options,
        string workFolder,
        ISyncObserver? observer,
        CancellationToken cancellationToken
    )
    {
        List<StoredApp> apps =
        [
            .. FleetStoreReader
                .ListApps(store, environment)
                .Where(app => options.Orgs is null || options.Orgs.Contains(app.App.Org)),
        ];
        Dictionary<AppIdentifier, CollectedApp> collected = database.ReadApps(environment);

        // Within the service owners asked for, an app that no longer runs leaves the file.
        HashSet<AppIdentifier> running = [.. apps.Select(app => app.App)];
        List<AppIdentifier> removed =
        [
            .. collected.Keys.Where(app =>
                (options.Orgs is null || options.Orgs.Contains(app.Org)) && !running.Contains(app)
            ),
        ];
        database.RemoveApps(environment, removed);

        List<StoredApp> pending =
        [
            .. apps.Where(app =>
                options.Force
                || !collected.TryGetValue(app.App, out CollectedApp? earlier)
                || earlier.Failed
                || earlier.Version != app.Version?.Value
            ),
        ];

        int completed = 0;
        int failed = 0;
        observer?.OnProgress(new SyncProgress(environment, SyncStage.Analyzing, 0, pending.Count));
        await Parallel.ForEachAsync(
            pending,
            new ParallelOptions { MaxDegreeOfParallelism = options.Parallelism, CancellationToken = cancellationToken },
            async (app, token) =>
            {
                AppUsage usage = await Analyze(environment, app.App, workFolder, token);
                lock (_databaseGate)
                {
                    database.PutApp(environment, app.App, app.Version?.Value, usage, DateTimeOffset.UtcNow);
                }

                if (usage.Failure is not null)
                {
                    Interlocked.Increment(ref failed);
                }

                int done = Interlocked.Increment(ref completed);
                observer?.OnProgress(new SyncProgress(environment, SyncStage.Analyzing, done, pending.Count));
            }
        );

        return new CollectResult(
            environment,
            apps.Count,
            pending.Count,
            apps.Count - pending.Count,
            failed,
            removed.Count
        );
    }

    private async Task<AppUsage> Analyze(
        RuntimeEnvironment environment,
        AppIdentifier app,
        string workFolder,
        CancellationToken cancellationToken
    )
    {
        string copy = Path.Join(workFolder, environment.Name, app.Org.Value, app.App.Value);
        try
        {
            CopyFolder(store.AppPath(environment, app), copy);
            return await analyzer.Analyze(copy, cancellationToken);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return AppUsage.Failed($"Could not copy the app to {copy}: {ex.Message}", 0);
        }
        finally
        {
            if (Directory.Exists(copy))
            {
                Directory.Delete(copy, recursive: true);
            }
        }
    }

    private static void CopyFolder(string source, string destination)
    {
        if (Directory.Exists(destination))
        {
            Directory.Delete(destination, recursive: true);
        }

        Directory.CreateDirectory(destination);
        foreach (string folder in Directory.EnumerateDirectories(source, "*", SearchOption.AllDirectories))
        {
            Directory.CreateDirectory(Path.Join(destination, Path.GetRelativePath(source, folder)));
        }

        foreach (string file in Directory.EnumerateFiles(source, "*", SearchOption.AllDirectories))
        {
            File.Copy(file, Path.Join(destination, Path.GetRelativePath(source, file)));
        }
    }
}
