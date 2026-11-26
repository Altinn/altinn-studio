using System.Diagnostics;
using Altinn.Studio.Common.Domain;

namespace Altinn.Studio.Fleet.Cli;

/// <summary>
/// Shows a sync's progress on standard error: one line rewritten in place at a terminal, and an occasional line
/// otherwise, so that logs stay short.
/// </summary>
internal sealed class ConsoleProgress(TextWriter output, bool interactive) : ISyncObserver, IDisposable
{
    private static readonly TimeSpan s_terminalInterval = TimeSpan.FromMilliseconds(100);
    private static readonly TimeSpan s_logInterval = TimeSpan.FromSeconds(10);

    private readonly Lock _gate = new();
    private (RuntimeEnvironment? Environment, SyncStage Stage) _current;
    private long _lastWrite;
    private bool _lineOpen;

    public void OnProgress(SyncProgress progress)
    {
        lock (_gate)
        {
            bool stageChanged = _current != (progress.Environment, progress.Stage);
            bool done = progress.Completed >= progress.Total;
            TimeSpan elapsed = Stopwatch.GetElapsedTime(_lastWrite);
            bool due = interactive ? done || elapsed >= s_terminalInterval : elapsed >= s_logInterval;
            if (!stageChanged && !due)
            {
                return;
            }

            _current = (progress.Environment, progress.Stage);
            _lastWrite = Stopwatch.GetTimestamp();
            string line =
                $"{progress.Environment.Name, -5} {Describe(progress.Stage)} {progress.Completed}/{progress.Total}";
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
