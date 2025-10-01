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
        var isCi = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("CI"));
        if (BuildServerDetector.Detected && BuildServerDetector.IsWsl && !isCi)
            BuildServerDetector.Detected = false; // WSL is not a build server
        VerifierSettings.AutoVerify(includeBuildServer: false);
        VerifyAspNetCore.Initialize();
    }

    internal static string GetProjectDirectory() => GetProjectDirectoryInternal();

    internal static string GetSolutionDirectory()
    {
        var solutionDirectory = Path.Join(GetProjectDirectory(), "..", "..");
        var info = new DirectoryInfo(solutionDirectory);
        if (!info.Exists)
        {
            throw new DirectoryNotFoundException(
                $"The directory {solutionDirectory} does not exist. Please check the path."
            );
        }
        return info.FullName;
    }

    private static string GetProjectDirectoryInternal([CallerFilePath] string? callerFilePath = null)
    {
        var directory = Path.GetDirectoryName(callerFilePath);
        Assert.NotNull(directory);
        Assert.True(Directory.Exists(directory), $"Project directory does not exist: {directory}");
        return directory;
    }
}
