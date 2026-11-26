namespace Altinn.Studio.Fleet.Analysis;

/// <summary>
/// Something fleet finds out about each app in the store by working on a copy of it, such as which app library APIs
/// the app uses. <see cref="AnalysisRunner"/> runs it over the apps and records the results in an
/// <see cref="AnalysisDatabase"/>.
/// </summary>
/// <remarks>
/// <see cref="Analyze"/> runs in a child process, which gets the analysis by its <see cref="Name"/> from
/// <see cref="Analyses.All"/> and the app's folder, and nothing else. The other members run in the host's process.
/// </remarks>
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
}

/// <summary>
/// An analysis that, once the apps of every environment are recorded, also records items that are not apps, such as
/// the app library versions the apps use, to compare the apps with. Each item is analyzed in a child process, as an
/// app is.
/// </summary>
public interface IItemAnalysis : IAppAnalysis
{
    /// <summary>What the items are, such as <c>app library versions</c>.</summary>
    string ItemsName { get; }

    /// <summary>
    /// Forgets the items that are no longer needed, and says which items to analyze. It runs in the host's process,
    /// in one transaction.
    /// </summary>
    ItemPlan PlanItems(AnalysisTables tables, AnalysisOptions options);

    /// <summary>
    /// Analyzes an item and writes what it found to a file. Like <see cref="IAppAnalysis.Analyze"/>, it runs in a
    /// process of its own, and a failure it cannot record in the file is an exception.
    /// </summary>
    Task AnalyzeItem(AnalysisItem item, string resultFile, CancellationToken cancellationToken);

    /// <summary>
    /// Records how the analysis of an item ended: the file <see cref="AnalyzeItem"/> wrote, or why it wrote none.
    /// Returns why the item could not be analyzed, or <c>null</c> when it could.
    /// </summary>
    string? RecordItem(AnalysisTables tables, AnalysisItem item, AnalysisOutcome outcome);
}

/// <summary>Something an <see cref="IItemAnalysis"/> records besides the apps.</summary>
/// <param name="Key">What identifies it in the analysis's tables, such as an app library version.</param>
/// <param name="Input">What the child process that analyzes it gets, such as that version or a folder.</param>
public sealed record AnalysisItem(string Key, string Input);

/// <summary>Which items an <see cref="IItemAnalysis"/> analyzes in a run.</summary>
/// <param name="Pending">The items to analyze.</param>
/// <param name="Total">How many items the analysis needs, those it analyzes included.</param>
/// <param name="Removed">How many items it forgot, because they are no longer needed.</param>
public sealed record ItemPlan(IReadOnlyList<AnalysisItem> Pending, int Total, int Removed);
