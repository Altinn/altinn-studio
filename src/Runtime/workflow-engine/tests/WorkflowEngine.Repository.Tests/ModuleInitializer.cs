using System.Runtime.CompilerServices;

namespace WorkflowEngine.Repository.Tests;

public static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Init()
    {
        VerifierSettings.InitializePlugins();

        UseProjectRelativeDirectory(".snapshots");
        VerifierSettings.AutoVerify(includeBuildServer: false);

        // Scrub volatile EXPLAIN plan fields that change between runs / PG versions
        VerifierSettings.ScrubMembers(
            "Startup Cost",
            "Total Cost",
            "Plan Rows",
            "Plan Width",
            "Parallel Aware",
            "Async Capable"
        );
    }
}
