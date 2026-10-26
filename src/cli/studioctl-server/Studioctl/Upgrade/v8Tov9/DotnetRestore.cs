using System.ComponentModel;
using System.Diagnostics;
using System.Text.RegularExpressions;
using Altinn.Studio.StudioctlServer.Platform;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>Runs <c>dotnet restore</c> for the upgrade, and finds the error in its output.</summary>
internal static class DotnetRestore
{
    // MSBuild's canonical diagnostic format: an optional origin (a path, with a drive letter on Windows),
    // then "error", an optional code, which ends in a digit, and the text. The keyword is never localized.
    // A multi-line error is printed one line at a time behind the same prefix, and its indented lines
    // only add detail, so they are never the line to quote.
    private static readonly Regex _errorPattern = new(
        @"^(?:(?:[A-Za-z]:)?[^:]*:)?\s*error(?:\s+[^\s:]*[0-9])?\s*:(?!\s{2})",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    /// <summary>
    /// Restores the project and returns stdout followed by stderr. <c>-tl:off</c> keeps the console
    /// logger, which prints each error on one line: MSBUILDTERMINALLOGGER or the app's
    /// <c>Directory.Build.rsp</c> can turn on the terminal logger, which colors errors and splits them.
    /// </summary>
    /// <param name="projectFolder">Working directory for <c>dotnet restore</c>.</param>
    /// <param name="configuration">The configuration to restore for, or null for the project's default.</param>
    public static async Task<(string Output, int ExitCode)> RunAsync(
        string projectFolder,
        string projectFile,
        string? configuration,
        CancellationToken cancellationToken
    )
    {
        var startInfo = ProcessUtil.CreateDotnetStartInfo("restore", projectFile, "-tl:off");
        if (configuration is not null)
        {
            startInfo.ArgumentList.Add($"-p:Configuration={configuration}");
        }
        startInfo.WorkingDirectory = projectFolder;
        startInfo.RedirectStandardOutput = true;
        startInfo.RedirectStandardError = true;

        using var process =
            Process.Start(startInfo) ?? throw new InvalidOperationException("Failed to start dotnet restore.");
        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        try
        {
            await process.WaitForExitAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // WaitForExitAsync only stops waiting on cancellation; the restore (and its child
            // processes) keeps running unless killed explicitly.
            try
            {
                if (!process.HasExited)
                {
                    process.Kill(entireProcessTree: true);
                }
            }
            catch (Exception ex) when (ex is InvalidOperationException or Win32Exception or NotSupportedException)
            {
                // Best-effort: the process may have exited between the check and the kill.
            }

            throw;
        }

        return ($"{await stdoutTask}\n{await stderrTask}", process.ExitCode);
    }

    /// <summary>
    /// The error line that explains a failed restore, or null when the output holds none. The last line
    /// rarely is: restore also prints progress, warnings and a "Failed to restore" summary, and the first
    /// run of an SDK prints its welcome banner and notices to stderr.
    /// </summary>
    public static string? FindError(string output) =>
        output.Split('\n').Select(line => line.Trim()).LastOrDefault(line => _errorPattern.IsMatch(line));
}
