using System.Diagnostics;

namespace Altinn.Studio.Fleet.Analysis;

/// <summary>Runs each analysis of an app in a process of its own, which writes the result to a file.</summary>
/// <remarks>
/// An analysis may keep state in the process, as MSBuild and Roslyn do, and an app's build can hang or take gigabytes.
/// A process per app keeps one app from affecting another, and lets a timeout end an analysis that hangs.
/// </remarks>
/// <param name="command">
/// The program and the arguments that run an analysis. The analysis's name, the app's folder and the result file are
/// added to them.
/// </param>
/// <param name="timeout">How long one analysis of one app may take.</param>
public sealed class ChildProcessExecutor(IReadOnlyList<string> command, TimeSpan timeout) : IAnalysisExecutor
{
    private const int MaxErrorLength = 2000;

    public async Task<string?> Run(
        IAppAnalysis analysis,
        string appDir,
        string resultFile,
        CancellationToken cancellationToken
    )
    {
        var start = new ProcessStartInfo(command[0])
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (string arg in command.Skip(1).Concat([analysis.Name, appDir, resultFile]))
        {
            start.ArgumentList.Add(arg);
        }

        using Process process =
            Process.Start(start) ?? throw new InvalidOperationException($"{command[0]} did not start.");
        using var reading = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        Task<string> stdout = process.StandardOutput.ReadToEndAsync(reading.Token);
        Task<string> stderr = process.StandardError.ReadToEndAsync(reading.Token);
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
            StopReading(reading, stdout, stderr);
            cancellationToken.ThrowIfCancellationRequested();
            return $"The analysis took longer than {timeout.TotalSeconds:F0} s.";
        }

        // The output only explains a failure.
        if (process.ExitCode == 0 && File.Exists(resultFile))
        {
            StopReading(reading, stdout, stderr);
            return null;
        }

        // A process that the analysis started and that outlived it, such as a build server, can keep the output open.
        // Reading it then stops at the deadline, which the analysis's own exit does not.
        string errors;
        try
        {
            await Task.WhenAll(stdout, stderr).WaitAsync(deadline.Token);
            errors = (await stderr).Trim();
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            StopReading(reading, stdout, stderr);
            errors = "Processes that the analysis started still held its output when the time was up.";
        }

        string tail = errors.Length > MaxErrorLength ? errors[^MaxErrorLength..] : errors;
        return $"The analysis exited with code {process.ExitCode} without a result. {tail}".Trim();
    }

    /// <summary>Stops reading output that may never end, and observes how the reads end.</summary>
    private static void StopReading(CancellationTokenSource reading, Task<string> stdout, Task<string> stderr)
    {
        reading.Cancel();
        _ = Task.WhenAll(stdout, stderr)
            .ContinueWith(
                task => task.Exception,
                CancellationToken.None,
                TaskContinuationOptions.OnlyOnFaulted,
                TaskScheduler.Default
            );
    }
}
