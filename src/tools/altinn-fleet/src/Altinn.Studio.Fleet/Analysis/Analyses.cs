using Altinn.Studio.Fleet.Analysis.ApiUsage;

namespace Altinn.Studio.Fleet.Analysis;

/// <summary>The analyses fleet has, which a host runs and which a child process finds by name.</summary>
public static class Analyses
{
    /// <summary>Every analysis.</summary>
    public static IReadOnlyList<IAppAnalysis> All { get; } = [new ApiUsageAnalysis()];

    /// <summary>The analysis with this name, or <c>null</c>.</summary>
    public static IAppAnalysis? Find(string name) => All.FirstOrDefault(analysis => analysis.Name == name);
}
