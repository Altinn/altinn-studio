namespace Altinn.Studio.Fleet.Analysis;

/// <summary>
/// Something fleet finds out about each app in the store by working on a copy of it, such as which app library APIs
/// the app uses. <see cref="AnalysisRunner"/> runs it over the apps and records the results in an
/// <see cref="AnalysisDatabase"/>.
/// </summary>
public interface IAppAnalysis
{
    /// <summary>
    /// The analysis's name in commands and in the database, such as <c>api-usage</c>. Its tables and indexes start with
    /// the name, with underscores for dashes: <c>api_usage_</c>.
    /// </summary>
    string Name { get; }

    /// <summary>
    /// The version of the analysis's tables and of what it finds. A database that an older version wrote has its
    /// tables replaced, so every app is analyzed again.
    /// </summary>
    int Version { get; }

    /// <summary>The <c>CREATE</c> statements for the analysis's tables and indexes.</summary>
    string Schema { get; }

    /// <summary>
    /// The analysis's tables that hold rows about an app, in <c>env</c>, <c>org</c> and <c>app</c> columns. They are
    /// cleared for an app before it is recorded again, and when it stops running.
    /// </summary>
    IReadOnlyList<string> AppTables { get; }

    /// <summary>
    /// Analyzes a copy of an app, which it may change, and writes what it found to a file. It runs in a process of its
    /// own, so it may keep state in the process, use much memory or hang; a failure it cannot record in the file is an
    /// exception.
    /// </summary>
    Task Analyze(string appDir, string resultFile, CancellationToken cancellationToken);

    /// <summary>
    /// Records a file that <see cref="Analyze"/> wrote in the analysis's tables, and returns why the app could not be
    /// analyzed, or <c>null</c> when it could.
    /// </summary>
    string? Record(AppRecorder recorder, string resultFile);

    /// <summary>
    /// Runs once the apps of every environment are recorded, for what the analysis records besides them, such as what
    /// to compare them with. Unlike <see cref="Analyze"/>, it runs in fleet's own process. Returns a line for the
    /// run's summary, or <c>null</c>.
    /// </summary>
    Task<string?> Complete(
        AnalysisDatabase database,
        AnalysisOptions options,
        ISyncObserver? observer,
        CancellationToken cancellationToken
    ) => Task.FromResult<string?>(null);
}
