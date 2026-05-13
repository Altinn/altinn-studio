namespace Altinn.Analysis;

internal static class Constants
{
    internal const string MainBranchFolder = "main";

    // Following settings are to tweak during test-runs
    internal static readonly int LimitOrgs = -1;
    internal static readonly int LimitRepos = -1;
    internal static readonly int LimitMaxParallelism = 8;
}
