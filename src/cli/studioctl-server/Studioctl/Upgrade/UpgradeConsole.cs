using System.Threading;

namespace Altinn.Studio.Cli.Upgrade;

/// <summary>
/// Keeps track of the progress of the upgrade run
/// </summary>
/// <remarks>
/// <see cref="Use(UpgradeReport, TextWriter)"/> collects steps and typed messages that the CLI renders
/// itself, and is what <c>v9</c> uses. <see cref="Use(TextWriter, TextWriter)"/> writes free text the CLI
/// prints verbatim, which is what <c>backend-v8</c> and <c>frontend-v4</c> still do.
/// </remarks>
internal static class UpgradeConsole
{
    private static readonly AsyncLocal<Writers?> Current = new();

    public static TextWriter Out =>
        Current.Value?.StandardOutput
        ?? throw new InvalidOperationException("Upgrade output writer is not configured.");

    public static TextWriter Error =>
        Current.Value?.StandardError ?? throw new InvalidOperationException("Upgrade error writer is not configured.");

    /// <summary>Writes this run as free text, for the upgrade paths that do not report typed messages.</summary>
    public static IDisposable Use(TextWriter output, TextWriter error)
    {
        var previous = Current.Value;
        Current.Value = new Writers(output, error, Report: null);
        return new Scope(previous);
    }

    /// <summary>Collects this run into <paramref name="report"/>, as steps and typed messages.</summary>
    public static IDisposable Use(UpgradeReport report, TextWriter error)
    {
        var previous = Current.Value;
        Current.Value = new Writers(StandardOutput: null, error, report);
        return new Scope(previous);
    }

    public static void WriteLine(string message) => Message(UpgradeMessageStatus.Info, message);

    public static void WriteErrorLine(string message)
    {
        Error.WriteLine(message);
    }

    /// <summary>
    /// Starts a step. Everything reported until the next <see cref="BeginStep"/> or the end of the scope
    /// belongs to it - steps run one after another, so there is nothing to close and no nesting.
    /// </summary>
    public static void BeginStep(string name)
    {
        var writers = Current.Value ?? throw new InvalidOperationException("Upgrade output writer is not configured.");
        if (writers.StandardOutput is { } writer)
        {
            writer.WriteLine(name);
            return;
        }

        var report =
            writers.Report ?? throw new InvalidOperationException("Upgrade output has neither a report nor a writer.");

        report.BeginStep(name);
    }

    /// <summary>A migration operation was applied, or a check ran and found nothing wrong.</summary>
    public static void Ok(string text) => Message(UpgradeMessageStatus.Ok, text);

    /// <summary>Neutral information, such as a count or a statistic.</summary>
    public static void Info(string text) => Message(UpgradeMessageStatus.Info, text);

    /// <summary>A migration that was not needed for this app.</summary>
    public static void Skip(string text) => Message(UpgradeMessageStatus.Skip, text);

    /// <summary>Something the user should look at, but the upgrade did what it could.</summary>
    public static void Warning(string text) => Message(UpgradeMessageStatus.Warning, text);

    /// <summary>The upgrade could not do this automatically; the user has to finish it by hand.</summary>
    public static void Todo(string text) => Message(UpgradeMessageStatus.Todo, text);

    /// <summary>A migration failed failed.</summary>
    public static void Failed(string text) => Message(UpgradeMessageStatus.Failed, text);

    /// <summary>
    /// Reports <paramref name="text"/> on the current step, with <paramref name="status"/>. A run writing
    /// free text has nowhere to put the status, so it drops it and writes the text as a line.
    /// </summary>
    public static void Message(UpgradeMessageStatus status, string text)
    {
        var writers = Current.Value ?? throw new InvalidOperationException("Upgrade output writer is not configured.");
        if (writers.StandardOutput is { } writer)
        {
            writer.WriteLine(text);
            return;
        }

        var step =
            writers.Report?.CurrentStep
            ?? throw new InvalidOperationException(
                $"No upgrade step has started; cannot report \"{text}\". Call UpgradeConsole.BeginStep(...) first."
            );

        step.Add(text, status);
    }

    private sealed record Writers(TextWriter? StandardOutput, TextWriter StandardError, UpgradeReport? Report);

    private sealed class Scope(Writers? previous) : IDisposable
    {
        public void Dispose()
        {
            Current.Value = previous;
        }
    }
}
