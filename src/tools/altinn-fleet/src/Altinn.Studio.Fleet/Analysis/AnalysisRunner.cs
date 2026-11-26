using System.Diagnostics;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.Analysis;

/// <summary>Runs an analysis of an app's folder and says whether it wrote its result.</summary>
public interface IAnalysisExecutor
{
    /// <summary>
    /// Runs <see cref="IAppAnalysis.Analyze"/> on an app's folder, and returns why it wrote no result file, or
    /// <c>null</c> when it wrote one.
    /// </summary>
    Task<string?> Run(IAppAnalysis analysis, string appDir, string resultFile, CancellationToken cancellationToken);
}

/// <summary>What <see cref="AnalysisRunner.Run"/> does.</summary>
public sealed record AnalysisOptions
{
    public required IReadOnlyList<RuntimeEnvironment> Environments { get; init; }

    /// <summary>Only these service owners, or all when <c>null</c>.</summary>
    public IReadOnlySet<ServiceOwnerCode>? Orgs { get; init; }

    /// <summary>How many apps to analyze at a time. An analysis may build the app, so this is bounded by memory and cores.</summary>
    public int Parallelism { get; init; } = 4;

    /// <summary>Analyze every app, also those already analyzed at their deployed version.</summary>
    public bool Force { get; init; }

    /// <summary>Where to copy the apps while they are analyzed. A temporary folder when <c>null</c>.</summary>
    public string? WorkFolder { get; init; }
}

/// <summary>What a run of one analysis did in an environment.</summary>
public sealed record AnalysisRunResult(
    RuntimeEnvironment Environment,
    string Analysis,
    int Apps,
    int Analyzed,
    int Unchanged,
    int Failed,
    int Removed
);

/// <summary>
/// Runs analyses over the apps in a store's environments and records the results. An app already analyzed at its
/// deployed version is skipped, unless the analysis failed, so a run after a sync only analyzes what changed.
/// </summary>
/// <remarks>
/// The store's app folders are never changed: an analysis may build the app, which writes into its folder, and the
/// store may be a read-only copy. Each analysis gets a copy of the app of its own.
/// </remarks>
public sealed class AnalysisRunner(
    FleetStore store,
    AnalysisDatabase database,
    IReadOnlyList<IAppAnalysis> analyses,
    IAnalysisExecutor executor
)
{
    private readonly Lock _databaseGate = new();

    public async Task<List<AnalysisRunResult>> Run(
        AnalysisOptions options,
        ISyncObserver? observer,
        CancellationToken cancellationToken
    )
    {
        foreach (IAppAnalysis analysis in analyses)
        {
            database.Prepare(analysis);
        }

        string workFolder = options.WorkFolder ?? Path.Join(Path.GetTempPath(), $"fleet-analysis-{Guid.NewGuid():N}");
        try
        {
            var results = new List<AnalysisRunResult>();
            foreach (RuntimeEnvironment environment in options.Environments)
            {
                results.AddRange(await Run(environment, options, workFolder, observer, cancellationToken));
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

    private async Task<List<AnalysisRunResult>> Run(
        RuntimeEnvironment environment,
        AnalysisOptions options,
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
        HashSet<AppIdentifier> running = [.. apps.Select(app => app.App)];
        var jobs = new List<(IAppAnalysis Analysis, StoredApp App)>();
        var removed = new Dictionary<string, int>();
        foreach (IAppAnalysis analysis in analyses)
        {
            Dictionary<AppIdentifier, AnalyzedApp> earlier = database.ReadApps(analysis, environment);

            // Within the service owners asked for, an app that no longer runs leaves the database.
            List<AppIdentifier> stopped =
            [
                .. earlier.Keys.Where(app =>
                    (options.Orgs is null || options.Orgs.Contains(app.Org)) && !running.Contains(app)
                ),
            ];
            database.RemoveApps(analysis, environment, stopped);
            removed[analysis.Name] = stopped.Count;
            jobs.AddRange(
                apps.Where(app =>
                        options.Force
                        || !earlier.TryGetValue(app.App, out AnalyzedApp? before)
                        || before.Failed
                        || before.Version != app.Version?.Value
                    )
                    .Select(app => (analysis, app))
            );
        }

        var analyzed = new Dictionary<string, int>();
        var failed = new Dictionary<string, int>();
        foreach (IAppAnalysis analysis in analyses)
        {
            analyzed[analysis.Name] = jobs.Count(job => job.Analysis == analysis);
            failed[analysis.Name] = 0;
        }

        int completed = 0;
        observer?.OnProgress(new SyncProgress(environment, SyncStage.Analyzing, 0, jobs.Count));
        await Parallel.ForEachAsync(
            jobs,
            new ParallelOptions { MaxDegreeOfParallelism = options.Parallelism, CancellationToken = cancellationToken },
            async (job, token) =>
            {
                string? failure = await Analyze(environment, job.Analysis, job.App, workFolder, token);
                if (failure is not null)
                {
                    lock (failed)
                    {
                        failed[job.Analysis.Name]++;
                    }
                }

                int done = Interlocked.Increment(ref completed);
                observer?.OnProgress(new SyncProgress(environment, SyncStage.Analyzing, done, jobs.Count));
            }
        );

        return
        [
            .. analyses.Select(analysis => new AnalysisRunResult(
                environment,
                analysis.Name,
                apps.Count,
                analyzed[analysis.Name],
                apps.Count - analyzed[analysis.Name],
                failed[analysis.Name],
                removed[analysis.Name]
            )),
        ];
    }

    /// <summary>Analyzes a copy of an app, records the outcome, and returns why the analysis failed, or <c>null</c>.</summary>
    private async Task<string?> Analyze(
        RuntimeEnvironment environment,
        IAppAnalysis analysis,
        StoredApp app,
        string workFolder,
        CancellationToken cancellationToken
    )
    {
        string copy = Path.Join(workFolder, environment.Name, analysis.Name, app.App.Org.Value, app.App.App.Value);
        string resultFile = $"{copy}.result";
        var timer = Stopwatch.StartNew();
        try
        {
            string? failure;
            try
            {
                CopyFolder(store.AppPath(environment, app.App), copy);
                failure = await executor.Run(analysis, copy, resultFile, cancellationToken);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                failure = $"Could not copy the app to {copy}: {ex.Message}";
            }

            var outcome = new AnalysisOutcome(
                failure,
                failure is null && File.Exists(resultFile) ? resultFile : null,
                timer.Elapsed.TotalSeconds
            );
            if (outcome is { Failure: null, ResultFile: null })
            {
                outcome = outcome with { Failure = "The analysis wrote no result." };
            }

            lock (_databaseGate)
            {
                return database.PutApp(
                    analysis,
                    environment,
                    app.App,
                    app.Version?.Value,
                    outcome,
                    DateTimeOffset.UtcNow
                );
            }
        }
        finally
        {
            if (Directory.Exists(copy))
            {
                Directory.Delete(copy, recursive: true);
            }

            File.Delete(resultFile);
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
