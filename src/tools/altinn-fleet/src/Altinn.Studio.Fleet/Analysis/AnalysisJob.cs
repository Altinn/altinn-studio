namespace Altinn.Studio.Fleet.Analysis;

/// <summary>
/// What a child process does for an analysis: analyze an app's folder, or an item. Only the analysis's name crosses
/// to the child, which finds the analysis in <see cref="Analyses.All"/>.
/// </summary>
/// <param name="Analysis">The analysis's name.</param>
public abstract record AnalysisJob(string Analysis)
{
    /// <summary>Analyze a copy of an app, with <see cref="IAppAnalysis.Analyze"/>.</summary>
    /// <param name="Analysis">The analysis's name.</param>
    /// <param name="AppDir">The copy's folder.</param>
    public sealed record App(string Analysis, string AppDir) : AnalysisJob(Analysis);

    /// <summary>Analyze an item, with <see cref="IItemAnalysis.AnalyzeItem"/>.</summary>
    /// <param name="Analysis">The analysis's name.</param>
    /// <param name="Value">The item.</param>
    public sealed record Item(string Analysis, AnalysisItem Value) : AnalysisJob(Analysis);
}

/// <summary>Runs an analysis job and says whether it wrote its result.</summary>
public interface IAnalysisExecutor
{
    /// <summary>Runs a job, and returns why it wrote no result file, or <c>null</c> when it wrote one.</summary>
    Task<string?> Run(AnalysisJob job, string resultFile, CancellationToken cancellationToken);
}
