using System.Diagnostics;

namespace Altinn.Studio.Fleet.Analysis;

/// <summary>
/// Runs each analysis job in a process of its own, which writes the result to a file. The host gives the command that
/// starts its own program in the child, and that program passes the arguments it gets to <see cref="RunJob"/>.
/// </summary>
/// <remarks>
/// An analysis may keep state in the process, as MSBuild and Roslyn do, and an app's build can hang or take gigabytes.
/// A process per job keeps one job from affecting another or the host, and lets a timeout end a job that hangs.
/// </remarks>
/// <param name="command">
/// The program and the arguments that start a child, such as <c>fleet analysis job</c>. The job's arguments are added
/// to them.
/// </param>
/// <param name="timeout">How long one job may take.</param>
public sealed class ChildProcessExecutor(IReadOnlyList<string> command, TimeSpan timeout) : IAnalysisExecutor
{
    private const int MaxErrorLength = 2000;

    public async Task<string?> Run(AnalysisJob job, string resultFile, CancellationToken cancellationToken)
    {
        var start = new ProcessStartInfo(command[0])
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (string arg in command.Skip(1).Concat(Arguments(job, resultFile)))
        {
            start.ArgumentList.Add(arg);
        }

        using Process process =
            Process.Start(start) ?? throw new InvalidOperationException($"{command[0]} did not start.");
        using var reading = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        Task<string> stdout = ReadTail(process.StandardOutput, reading.Token);
        Task<string> stderr = ReadTail(process.StandardError, reading.Token);
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

        return $"The analysis exited with code {process.ExitCode} without a result. {errors}".Trim();
    }

    /// <summary>The exit code of a child whose analysis failed, after it wrote why to standard error.</summary>
    public const int ChildFailed = 1;

    /// <summary>The exit code of a child that got arguments it does not understand.</summary>
    public const int ChildUsage = 2;

    /// <summary>The arguments that describe a job to the child, after the host's command.</summary>
    public static IReadOnlyList<string> Arguments(AnalysisJob job, string resultFile) =>
        job switch
        {
            AnalysisJob.App app => ["app", app.Analysis, app.AppDir, resultFile],
            AnalysisJob.Item item => ["item", item.Analysis, item.Value.Key, item.Value.Input, resultFile],
            _ => throw new ArgumentException($"Unknown job {job}.", nameof(job)),
        };

    /// <summary>
    /// Runs, in the child, the job that <see cref="Arguments"/> describes. Writes why the analysis failed to
    /// <paramref name="error"/>, and returns the process's exit code.
    /// </summary>
    public static async Task<int> RunJob(
        IReadOnlyList<string> arguments,
        IReadOnlyList<IAppAnalysis> analyses,
        TextWriter error,
        CancellationToken cancellationToken
    )
    {
        IAppAnalysis? analysis = arguments.Count > 1 ? analyses.FirstOrDefault(a => a.Name == arguments[1]) : null;
        Func<Task>? run = (arguments, analysis) switch
        {
            (["app", _, string appDir, string resultFile], not null) => () =>
                analysis.Analyze(appDir, resultFile, cancellationToken),
            (["item", _, string key, string input, string resultFile], IItemAnalysis items) => () =>
                items.AnalyzeItem(new AnalysisItem(key, input), resultFile, cancellationToken),
            _ => null,
        };
        if (run is null)
        {
            error.WriteLine($"Not an analysis job: {string.Join(' ', arguments)}");
            return ChildUsage;
        }

        try
        {
            await run();
            return 0;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Whatever the analysis throws is a fact about the job. The host records what this writes.
            error.WriteLine(ex is FleetException ? ex.Message : ex.ToString());
            return ChildFailed;
        }
    }

    /// <summary>
    /// Reads a stream to its end and keeps only its last <see cref="MaxErrorLength"/> characters, since a child can
    /// write without limit until the deadline.
    /// </summary>
    private static async Task<string> ReadTail(StreamReader reader, CancellationToken cancellationToken)
    {
        var tail = new System.Text.StringBuilder();
        char[] buffer = new char[4096];
        int read;
        while ((read = await reader.ReadAsync(buffer, cancellationToken)) > 0)
        {
            tail.Append(buffer, 0, read);
            if (tail.Length > 2 * MaxErrorLength)
            {
                tail.Remove(0, tail.Length - MaxErrorLength);
            }
        }

        return tail.Length > MaxErrorLength
            ? tail.ToString(tail.Length - MaxErrorLength, MaxErrorLength)
            : tail.ToString();
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
