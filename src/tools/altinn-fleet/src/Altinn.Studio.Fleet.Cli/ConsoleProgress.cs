using System.Diagnostics;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Fleet.Analysis;

namespace Altinn.Studio.Fleet.Cli;

/// <summary>
/// Shows the progress of a sync or a run of analyses on standard error: one line rewritten in place at a terminal, and
/// an occasional line otherwise, so that logs stay short.
/// </summary>
internal sealed class ConsoleProgress(TextWriter output, bool interactive)
    : ISyncObserver,
        IAnalysisObserver,
        IDisposable
{
    private static readonly TimeSpan s_terminalInterval = TimeSpan.FromMilliseconds(100);
    private static readonly TimeSpan s_logInterval = TimeSpan.FromSeconds(10);

    private readonly Lock _gate = new();
    private string? _current;
    private int _shown;
    private long _lastWrite;
    private bool _lineOpen;

    public void OnProgress(SyncProgress progress) =>
        Write(
            $"{progress.Environment.Name}|{progress.Stage}",
            $"{progress.Environment.Name, -5} {Describe(progress.Stage)}",
            progress.Completed,
            progress.Total
        );

    public void OnAppsProgress(RuntimeEnvironment environment, int completed, int total) =>
        Write($"{environment.Name}|apps", $"{environment.Name, -5} analyzing", completed, total);

    public void OnItemsProgress(string analysis, string items, int completed, int total) =>
        Write($"{analysis}|items", $"{analysis} analyzing {items}", completed, total);

    private void Write(string stage, string label, int completed, int total)
    {
        lock (_gate)
        {
            bool stageChanged = _current != stage;

            // A job counts itself done before it reports it, so a report can arrive after a later one.
            if (!stageChanged && completed < _shown)
            {
                return;
            }

            bool done = completed >= total;
            TimeSpan elapsed = Stopwatch.GetElapsedTime(_lastWrite);
            bool due = interactive ? done || elapsed >= s_terminalInterval : elapsed >= s_logInterval;
            if (!stageChanged && !due)
            {
                return;
            }

            _current = stage;
            _shown = completed;
            _lastWrite = Stopwatch.GetTimestamp();
            string line = $"{label} {completed}/{total}";
            if (interactive)
            {
                output.Write($"\r\u001b[2K{line}");
                _lineOpen = true;
            }
            else
            {
                output.WriteLine(line);
            }
        }
    }

    /// <summary>Clears the progress line, so that the summary starts on an empty line.</summary>
    public void Dispose()
    {
        lock (_gate)
        {
            if (_lineOpen)
            {
                output.Write("\r\u001b[2K");
                _lineOpen = false;
            }
        }
    }

    private static string Describe(SyncStage stage) =>
        stage switch
        {
            SyncStage.Discovering => "listing deployed apps",
            SyncStage.Resolving => "looking up releases",
            SyncStage.Fetching => "downloading",
            SyncStage.Indexing => "indexing",
            _ => stage.ToString(),
        };
}
