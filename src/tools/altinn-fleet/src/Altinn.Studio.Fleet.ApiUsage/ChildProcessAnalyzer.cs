using System.Diagnostics;
using System.Text.Json;

namespace Altinn.Studio.Fleet.ApiUsage;

/// <summary>
/// Analyzes each app in a process of its own, which runs <see cref="AppCollector"/> and writes the result to a file.
/// </summary>
/// <remarks>
/// MSBuild and Roslyn keep a build's state in the process, and an app's build can hang or take gigabytes. A process
/// per app keeps one app from affecting another, and lets a timeout end a build that hangs.
/// </remarks>
/// <param name="command">The program and the arguments that run <c>fleet api-usage collect-app</c>.</param>
/// <param name="timeout">How long one app may take.</param>
internal sealed class ChildProcessAnalyzer(IReadOnlyList<string> command, TimeSpan timeout) : IAppAnalyzer
{
    private const int MaxErrorLength = 2000;

    public async Task<AppUsage> Analyze(string appDir, CancellationToken cancellationToken)
    {
        var timer = Stopwatch.StartNew();
        string resultFile = $"{appDir.TrimEnd(Path.DirectorySeparatorChar)}.usage.json";
        var start = new ProcessStartInfo(command[0])
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (string arg in command.Skip(1).Concat([appDir, resultFile]))
        {
            start.ArgumentList.Add(arg);
        }

        Dotnet.PrepareEnvironment(start.Environment);
        using Process process =
            Process.Start(start) ?? throw new InvalidOperationException($"{command[0]} did not start.");
        Task<string> stderr = process.StandardError.ReadToEndAsync(cancellationToken);
        Task drain = process.StandardOutput.ReadToEndAsync(cancellationToken);
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(timeout);
        try
        {
            await process.WaitForExitAsync(deadline.Token);
        }
        catch (OperationCanceledException)
        {
            process.Kill(entireProcessTree: true);
            await process.WaitForExitAsync(CancellationToken.None);
            cancellationToken.ThrowIfCancellationRequested();
            return AppUsage.Failed(
                $"The analysis took longer than {timeout.TotalSeconds:F0} s.",
                timer.Elapsed.TotalSeconds
            );
        }

        await drain;
        string errors = (await stderr).Trim();
        try
        {
            if (File.Exists(resultFile))
            {
                await using FileStream stream = File.OpenRead(resultFile);
                AppUsage? usage = await JsonSerializer.DeserializeAsync(
                    stream,
                    ApiUsageJsonContext.Default.AppUsage,
                    cancellationToken
                );
                if (usage is not null)
                {
                    return usage;
                }
            }
        }
        finally
        {
            File.Delete(resultFile);
        }

        string tail = errors.Length > MaxErrorLength ? errors[^MaxErrorLength..] : errors;
        return AppUsage.Failed(
            $"The analysis exited with code {process.ExitCode} without a result. {tail}".Trim(),
            timer.Elapsed.TotalSeconds
        );
    }
}
