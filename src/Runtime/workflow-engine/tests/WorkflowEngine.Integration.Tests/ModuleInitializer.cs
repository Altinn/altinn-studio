using System.Runtime.CompilerServices;
using DiffEngine;

namespace WorkflowEngine.Integration.Tests;

public static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Init()
    {
        VerifierSettings.InitializePlugins();
        var isCi = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("CI"));
        if (BuildServerDetector.Detected && BuildServerDetector.IsWsl && !isCi)
            BuildServerDetector.Detected = false; // WSL is not a build server

        // Automatically accept new test snapshots
        UseProjectRelativeDirectory(".snapshots");
        VerifierSettings.AutoVerify(includeBuildServer: false);

        // Scrub volatile fields that change between test runs
        VerifierSettings.ScrubMembers("databaseId", "createdAt", "updatedAt", "backoffUntil", "traceId");
    }
}
