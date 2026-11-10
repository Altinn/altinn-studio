using System.ComponentModel;
using System.Diagnostics;
using Altinn.Studio.StudioctlServer.Platform;
using NuGet.Versioning;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal static class V9SdkRequirement
{
    public static Task<string?> FindProblem(
        string projectFolder,
        string minimumVersion,
        CancellationToken cancellationToken
    ) => FindProblem(projectFolder, minimumVersion, RunDotnet, cancellationToken);

    internal static async Task<string?> FindProblem(
        string projectFolder,
        string minimumVersion,
        Func<string, string, CancellationToken, Task<DotnetResult>> runDotnet,
        CancellationToken cancellationToken
    )
    {
        var minimum = NuGetVersion.Parse(minimumVersion);

        DotnetResult version;
        try
        {
            version = await runDotnet(projectFolder, "--version", cancellationToken);
        }
        catch (Win32Exception exception)
        {
            return $"dotnet could not be started for {projectFolder}: {exception.Message}. {Requirement(minimum)} SDK download: {DownloadUrl(minimum)}.";
        }

        if (version.ExitCode != 0)
        {
            return WithDiagnostics(
                $"dotnet --version failed for {projectFolder} (exit code {version.ExitCode}). {Requirement(minimum)}",
                version
            );
        }

        if (!NuGetVersion.TryParse(version.StandardOutput.Trim(), out var selected))
        {
            return WithDiagnostics(
                $"Could not read the .NET SDK version dotnet selects for {projectFolder}. {Requirement(minimum)}",
                version
            );
        }

        if (selected >= minimum)
            return null;

        var selectedFact = $".NET SDK {selected} is selected for {projectFolder}. {Requirement(minimum)}";
        DotnetResult available;
        try
        {
            available = await runDotnet(projectFolder, "--list-sdks", cancellationToken);
        }
        catch (Win32Exception exception)
        {
            return $"{selectedFact} dotnet --list-sdks could not be started: {exception.Message}.";
        }

        if (available.ExitCode != 0)
        {
            return WithDiagnostics(
                $"{selectedFact} dotnet --list-sdks failed (exit code {available.ExitCode}).",
                available
            );
        }

        return $"{selectedFact} {SdkSelection(projectFolder, FindGlobalJson(projectFolder), ParseSdkList(available.StandardOutput), minimum)}";
    }

    private static string SdkSelection(
        string projectFolder,
        string? globalJson,
        IReadOnlyCollection<NuGetVersion> available,
        NuGetVersion minimum
    )
    {
        var eligible = available.Where(version => version >= minimum).Max();
        if (eligible is null)
        {
            var fact =
                $"No .NET SDK {minimum} or newer is available to dotnet in {projectFolder}. SDK download: {DownloadUrl(minimum)}.";
            return globalJson is null ? fact : $"{fact} SDK selection is configured by {globalJson}.";
        }

        var availableFact = $".NET SDK {eligible} is available to dotnet in {projectFolder}.";
        if (globalJson is null)
            return $"{availableFact} dotnet does not select it.";

        var allowPrerelease = eligible.IsPrerelease ? " and allowPrerelease to true" : "";
        return $"{availableFact} Set sdk.version in {globalJson} to {eligible}{allowPrerelease}.";
    }

    private static string WithDiagnostics(string message, DotnetResult result)
    {
        var blocks = new List<string> { message };
        if (!string.IsNullOrWhiteSpace(result.StandardError))
            blocks.Add($"dotnet stderr:{Environment.NewLine}{result.StandardError.Trim()}");
        if (!string.IsNullOrWhiteSpace(result.StandardOutput))
            blocks.Add($"dotnet stdout:{Environment.NewLine}{result.StandardOutput.Trim()}");
        return string.Join(Environment.NewLine + Environment.NewLine, blocks);
    }

    private static string Requirement(NuGetVersion minimum) => $"Upgrading to v9 requires .NET SDK {minimum} or newer.";

    private static IReadOnlyList<NuGetVersion> ParseSdkList(string output) =>
        output
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(line => line.Split(' ', 2)[0])
            .Select(value => NuGetVersion.TryParse(value, out var version) ? version : null)
            .OfType<NuGetVersion>()
            .ToList();

    private static string DownloadUrl(NuGetVersion minimum) =>
        $"https://dotnet.microsoft.com/download/dotnet/{minimum.Major}.0";

    private static string? FindGlobalJson(string projectFolder)
    {
        for (var directory = new DirectoryInfo(projectFolder); directory is not null; directory = directory.Parent)
        {
            var path = Path.Combine(directory.FullName, "global.json");
            if (File.Exists(path))
                return path;
        }
        return null;
    }

    private static async Task<DotnetResult> RunDotnet(
        string projectFolder,
        string argument,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var startInfo = ProcessUtil.CreateDotnetStartInfo(argument);
        startInfo.WorkingDirectory = projectFolder;
        startInfo.RedirectStandardOutput = true;
        startInfo.RedirectStandardError = true;

        using var process = Process.Start(startInfo) ?? throw new InvalidOperationException("Failed to start dotnet.");
        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        try
        {
            await process.WaitForExitAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // WaitForExitAsync only stops waiting; terminate dotnet too.
            try
            {
                if (!process.HasExited)
                    process.Kill(entireProcessTree: true);
            }
            catch (Exception exception)
                when (exception is InvalidOperationException or Win32Exception or NotSupportedException)
            {
                // Best-effort: the process may have exited between the check and the kill.
            }
            throw;
        }

        return new DotnetResult(process.ExitCode, await stdoutTask, await stderrTask);
    }

    internal sealed record DotnetResult(int ExitCode, string StandardOutput, string StandardError);
}
