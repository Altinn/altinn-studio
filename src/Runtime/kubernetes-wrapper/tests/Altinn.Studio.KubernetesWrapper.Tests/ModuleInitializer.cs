using System.Runtime.CompilerServices;
using DiffEngine;

namespace Altinn.Studio.KubernetesWrapper.Tests;

internal static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Init()
    {
        VerifierSettings.InitializePlugins();
        var isCi = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("CI"));
        if (BuildServerDetector.Detected && BuildServerDetector.IsWsl && !isCi)
            BuildServerDetector.Detected = false; // WSL is not a build server
        VerifierSettings.AutoVerify(includeBuildServer: false);
    }
}
