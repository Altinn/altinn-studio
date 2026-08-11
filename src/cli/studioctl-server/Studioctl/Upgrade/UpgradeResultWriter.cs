using System.Threading;

namespace Altinn.Studio.Cli.Upgrade;

/// <summary>
/// Ambient output for an upgrade run, so migrators can report without every one of them taking a writer
/// or a reporter through its constructor.
/// </summary>
/// <remarks>
/// Two sinks exist while the upgrade paths are being converted to structured output: a
/// <see cref="TextWriter"/> sink (<c>frontend-v4</c>, <c>backend-v8</c>) whose text the CLI prints
/// verbatim, and an <see cref="UpgradeReport"/> sink (<c>v9</c>) where <see cref="Ok"/> and friends
/// record a status the CLI renders itself. Statuses degrade across sinks, so shared code reports once
/// for both: on the text sink a typed status is dropped and its text written as a plain line, and on the
/// report sink <see cref="WriteLine"/> lands as <see cref="UpgradeMessageStatus.Info"/>. The error
/// channel is a <see cref="TextWriter"/> on both sinks.
/// </remarks>
internal static class UpgradeResultWriter
{
    private static readonly AsyncLocal<Writers?> Current = new();

    public static TextWriter Out =>
        Current.Value?.StandardOutput
        ?? throw new InvalidOperationException("Upgrade output writer is not configured.");

    public static TextWriter Error =>
        Current.Value?.StandardError ?? throw new InvalidOperationException("Upgrade error writer is not configured.");

    /// <summary>Installs a plain text sink, for the upgrade paths that still emit free text.</summary>
    public static IDisposable Use(TextWriter output, TextWriter error)
    {
        var previous = Current.Value;
        Current.Value = new Writers(output, error, Report: null);
        return new Scope(previous);
    }

    /// <summary>Installs a structured sink, collecting into <paramref name="report"/>.</summary>
    public static IDisposable Use(UpgradeReport report, TextWriter error)
    {
        var previous = Current.Value;
        Current.Value = new Writers(StandardOutput: null, error, report);
        return new Scope(previous);
    }

    /// <summary>
    /// Starts a step. Everything reported until the next <see cref="BeginStep"/> or the end of the scope
    /// belongs to it - steps run one after another, so there is nothing to close and no nesting.
    /// </summary>
    /// <remarks>
    /// Every step appears in the report, even one that reports nothing - the bare name shows it ran.
    /// </remarks>
    public static void BeginStep(string name)
    {
        var writers = Current.Value;
        var report =
            writers?.Report
            ?? throw new InvalidOperationException("Upgrade steps require a report sink. Use(UpgradeReport, ...).");

        writers.Step = report.BeginStep(name);
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

    /// <summary>
    /// Records that the current step failed. Display only: the caller still decides and returns the exit
    /// code, and the verbatim message still goes to <see cref="Error"/> for stderr.
    /// </summary>
    public static void Failed(string text) => Message(UpgradeMessageStatus.Failed, text);

    /// <summary>
    /// Reports <paramref name="text"/> on the current step, with <paramref name="status"/>. On the text
    /// sink the status is dropped and the text written as a plain line.
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
            writers.Step
            ?? throw new InvalidOperationException(
                $"No upgrade step has started; cannot report \"{text}\". Call UpgradeResultWriter.BeginStep(...) first."
            );

        step.Add(text, status);
    }

    /// <summary>
    /// Writes one line: verbatim on the text sink, an <see cref="UpgradeMessageStatus.Info"/> message on
    /// the report sink - how call sites that do not carry a real status yet keep working.
    /// </summary>
    public static void WriteLine(string message) => Message(UpgradeMessageStatus.Info, message);

    public static void WriteErrorLine(string message)
    {
        Error.WriteLine(message);
    }

    /// <summary>
    /// Writes description and exception to the error output, with a hint added for file-access failures.
    /// </summary>
    public static Task WriteErrorAsync(string description, Exception exception) =>
        Error.WriteLineAsync($"{description}: {FileAccessDiagnostics.Describe(exception)}");

    /// <summary>
    /// The ambient destination of one upgrade run: exactly one of <paramref name="StandardOutput"/> (text
    /// sink) and <paramref name="Report"/> (structured sink) is set. <see cref="Step"/> is the report
    /// sink's current step; steps are sequential (see <see cref="BeginStep"/>), so parallel migrators may
    /// report to the current step - <see cref="UpgradeReport"/> locks - but must not begin one.
    /// </summary>
    private sealed record Writers(TextWriter? StandardOutput, TextWriter StandardError, UpgradeReport? Report)
    {
        public UpgradeReport.StepState? Step { get; set; }
    }

    private sealed class Scope(Writers? previous) : IDisposable
    {
        public void Dispose()
        {
            Current.Value = previous;
        }
    }
}
