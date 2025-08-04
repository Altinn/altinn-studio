using System.Runtime.CompilerServices;
using DiffEngine;

namespace Altinn.App.Integration.Tests;

internal static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Init()
    {
        Verifier.DerivePathInfo(
            (file, _, type, method) => new(Path.Join(Path.GetDirectoryName(file), "_snapshots"), type.Name, method.Name)
        );
        if (BuildServerDetector.Detected && BuildServerDetector.IsWsl)
            BuildServerDetector.Detected = false; // WSL is not a build server
        VerifierSettings.AutoVerify(includeBuildServer: false);
        VerifyAspNetCore.Initialize();
    }

    internal static string GetProjectDirectory() => GetProjectDirectoryInternal();

    private static string GetProjectDirectoryInternal([CallerFilePath] string? callerFilePath = null)
    {
        var directory = Path.GetDirectoryName(callerFilePath);
        Assert.NotNull(directory);
        Assert.True(Directory.Exists(directory), $"Project directory does not exist: {directory}");
        return directory;
    }
}
