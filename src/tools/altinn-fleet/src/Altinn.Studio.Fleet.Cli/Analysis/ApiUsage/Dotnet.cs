using System.Diagnostics;
using System.Text;
using Microsoft.Build.Locator;

namespace Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;

/// <summary>Registers MSBuild for Roslyn's MSBuild workspace, once per process.</summary>
internal static class MSBuildSetup
{
    private static readonly Lock s_gate = new();

    /// <summary>
    /// Loads MSBuild from the .NET SDK that this tool runs with. Call it before any code that uses MSBuild types is
    /// compiled, which means from a method that does not use them itself.
    /// </summary>
    public static void EnsureRegistered()
    {
        lock (s_gate)
        {
            if (!MSBuildLocator.IsRegistered)
            {
                MSBuildLocator.RegisterDefaults();
            }
        }
    }
}

/// <summary>Runs the <c>dotnet</c> commands an analysis needs.</summary>
internal static class Dotnet
{
    /// <summary>
    /// The MSBuild properties an analysis builds with: the release configuration apps deploy with, and no NuGet
    /// audit, whose warnings fail the build of a project that treats warnings as errors, though the code compiles.
    /// </summary>
    public static Dictionary<string, string> BuildProperties() =>
        new() { ["Configuration"] = "Release", ["NuGetAudit"] = "false" };

    private const int MaxErrorLength = 2000;

    // MSBuildLocator sets these to the SDK this tool runs with. A project whose global.json selects another SDK must
    // not inherit them, or that SDK's MSBuild loads with this SDK's folder.
    private static readonly string[] s_msbuildVariables =
    [
        "MSBuildExtensionsPath",
        "MSBUILD_EXE_PATH",
        "MSBuildSDKsPath",
        "MSBuildLoadMicrosoftTargetsReadOnly",
    ];

    /// <summary>Restores a project, and returns what went wrong, or <c>null</c> when it succeeded.</summary>
    public static async Task<string?> Restore(string projectFile, CancellationToken cancellationToken)
    {
        var start = new ProcessStartInfo("dotnet")
        {
            WorkingDirectory = Path.GetDirectoryName(projectFile),
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (
            string arg in (string[])
                [
                    "restore",
                    projectFile,
                    "-p:Configuration=Release",
                    "-p:NuGetAudit=false",
                    "--verbosity",
                    "quiet",
                    "--disable-build-servers",
                ]
        )
        {
            start.ArgumentList.Add(arg);
        }

        PrepareEnvironment(start.Environment);
        using Process process = Process.Start(start) ?? throw new InvalidOperationException("dotnet did not start.");
        var output = new StringBuilder();
        Task stdout = Copy(process.StandardOutput, output);
        Task stderr = Copy(process.StandardError, output);
        try
        {
            await process.WaitForExitAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            process.Kill(entireProcessTree: true);
            throw;
        }

        await Task.WhenAll(stdout, stderr);
        if (process.ExitCode == 0)
        {
            return null;
        }

        string text = output.ToString().Trim();
        return text.Length > MaxErrorLength ? text[..MaxErrorLength] : text;
    }

    /// <summary>
    /// The environment for a process that builds an app: without MSBuildLocator's variables, without hooks such as
    /// Husky.Net's that some apps run on restore, and without MSBuild nodes that outlive it. Several analyses run at
    /// once, and a restore can wait forever on a reused node that another one holds.
    /// </summary>
    public static void PrepareEnvironment(IDictionary<string, string?> environment)
    {
        foreach ((string name, string? value) in Variables())
        {
            if (value is null)
            {
                environment.Remove(name);
            }
            else
            {
                environment[name] = value;
            }
        }
    }

    /// <summary>
    /// Gives this process the environment of <see cref="PrepareEnvironment"/>, so that the processes MSBuild and Roslyn
    /// start for it inherit it. Call it before MSBuild is registered.
    /// </summary>
    public static void PrepareProcess()
    {
        foreach ((string name, string? value) in Variables())
        {
            Environment.SetEnvironmentVariable(name, value);
        }
    }

    private static IEnumerable<(string Name, string? Value)> Variables()
    {
        foreach (string name in s_msbuildVariables)
        {
            yield return (name, null);
        }

        yield return ("HUSKY", "0");
        yield return ("MSBUILDDISABLENODEREUSE", "1");
        yield return ("DOTNET_CLI_USE_MSBUILD_SERVER", "0");
    }

    private static async Task Copy(StreamReader reader, StringBuilder output)
    {
        string text = await reader.ReadToEndAsync();
        lock (output)
        {
            output.Append(text);
        }
    }
}
