using Altinn.Studio.Common.Domain;

namespace Altinn.Studio.Fleet.Analysis;

/// <summary>Follows a run of analyses while it runs. The runner calls it from several threads.</summary>
public interface IAnalysisObserver
{
    /// <summary>Called when the analyses of an environment's apps start and as they make progress.</summary>
    /// <param name="environment">The environment.</param>
    /// <param name="completed">How many of the apps' analyses are done.</param>
    /// <param name="total">How many there are.</param>
    void OnAppsProgress(RuntimeEnvironment environment, int completed, int total);

    /// <summary>Called when an analysis's items start and as they make progress. See <see cref="IItemAnalysis"/>.</summary>
    /// <param name="analysis">The analysis.</param>
    /// <param name="items">What the items are, such as <c>app library versions</c>.</param>
    /// <param name="completed">How many of the items are done.</param>
    /// <param name="total">How many there are.</param>
    void OnItemsProgress(string analysis, string items, int completed, int total);
}
