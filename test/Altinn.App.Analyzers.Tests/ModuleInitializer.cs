using System.Runtime.CompilerServices;
using Altinn.App.Analyzers.Tests.Fixtures;
using DiffEngine;

namespace Altinn.App.Analyzers.Tests;

public class ModuleInitializer
{
    public static string ProjectDirectory { get; private set; } = "";
    public static string TestAppDirectory { get; private set; } = "";

    [ModuleInitializer]
    public static void Init()
    {
        var testProjectDir = GetTestProjectDirectory();
        Directory.SetCurrentDirectory(testProjectDir.FullName);
        var path = Path.Combine(testProjectDir.FullName, "testapp", "App.sln");
        Assert.True(File.Exists(path));
        path = Path.GetFullPath(path);
        Assert.True(File.Exists(path));
        var testAppDirectory = Path.GetDirectoryName(path);
        Assert.NotNull(testAppDirectory);
        Assert.True(Directory.Exists(testAppDirectory));
        TestAppDirectory = testAppDirectory;
        ProjectDirectory = testProjectDir.FullName;

        InnerVerifier.ThrowIfVerifyHasBeenRun();
        VerifierSettings.AddExtraSettings(serializer =>
        {
            var converters = serializer.Converters;
            converters.Add(new DiagnosticJsonConverter());
        });
        Verifier.UseProjectRelativeDirectory("_snapshots");
        var isCi = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("CI"));
        if (BuildServerDetector.Detected && BuildServerDetector.IsWsl && !isCi)
            BuildServerDetector.Detected = false; // WSL is not a build server
        VerifierSettings.AutoVerify(includeBuildServer: false);
    }

    private static DirectoryInfo GetTestProjectDirectory([CallerFilePath] string callerFilePath = "")
    {
        var projDir = Path.GetDirectoryName(callerFilePath) ?? "";
        var projFile = Path.Combine(projDir, "Altinn.App.Analyzers.Tests.csproj");
        if (!File.Exists(projFile))
        {
            throw new FileNotFoundException(
                $"Unable to initialize testproject. Could not find '{projFile}' in the current directory.",
                projFile
            );
        }
        return new DirectoryInfo(projDir);
    }
}
