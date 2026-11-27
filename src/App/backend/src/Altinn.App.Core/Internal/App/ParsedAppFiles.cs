using System.Collections.Immutable;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// The models parsed from one <see cref="AppFiles"/> snapshot, built by <see cref="AppFilesAccessor"/> whenever a
/// snapshot is set, so a snapshot a reader can see is valid and fully parsed. Readers take
/// <see cref="AppFilesAccessor.Parsed"/> once per operation.
/// </summary>
internal sealed class ParsedAppFiles
{
    /// <summary>
    /// The snapshot the models were parsed from.
    /// </summary>
    public AppFiles Files { get; }

    /// <summary>
    /// Problems that do not stop the app, sorted by path, then message. Logged when the snapshot is set.
    /// </summary>
    public ImmutableArray<AppFileDiagnostic> Diagnostics { get; }

    /// <summary>
    /// Used by <see cref="Parse"/>, and by tests that need diagnostics no parser produces yet.
    /// </summary>
    internal ParsedAppFiles(AppFiles files, ImmutableArray<AppFileDiagnostic> diagnostics)
    {
        Files = files;
        Diagnostics = diagnostics;
    }

    /// <summary>
    /// Runs every parser on the snapshot.
    /// </summary>
    /// <exception cref="ApplicationConfigException">With every error found, in the format of
    /// <see cref="AppFilesLoader"/>, when the snapshot cannot be used.</exception>
    public static ParsedAppFiles Parse(AppFiles files)
    {
        ArgumentNullException.ThrowIfNull(files);
        var problems = new AppFileProblems();

        // Parsers go here, in plain code and in dependency order: a parser that needs another one's result takes it
        // as an argument. Every parser runs even after an error, so one load reports every problem.

        if (problems.HasErrors)
        {
            throw problems.ToException();
        }

        return new ParsedAppFiles(files, problems.Diagnostics);
    }
}

/// <summary>
/// A problem in an app file that does not stop the app.
/// </summary>
/// <param name="Level">The level it is logged at</param>
/// <param name="Path">Path relative to the app folder with '/' separators</param>
/// <param name="Message">What is wrong</param>
internal sealed record AppFileDiagnostic(LogLevel Level, string Path, string Message);

/// <summary>
/// Collects what the parsers in <see cref="ParsedAppFiles.Parse"/> report. An error rejects the snapshot; a
/// diagnostic is logged and the app runs.
/// </summary>
internal sealed class AppFileProblems
{
    private readonly List<string> _errors = [];
    private readonly List<AppFileDiagnostic> _diagnostics = [];

    /// <summary>
    /// Reports a problem that rejects the snapshot.
    /// </summary>
    public void Error(string path, string message) => _errors.Add($"{path}: {message}");

    /// <summary>
    /// Reports a problem that is logged at <paramref name="level"/>, while the app runs.
    /// </summary>
    public void Diagnostic(LogLevel level, string path, string message) =>
        _diagnostics.Add(new AppFileDiagnostic(level, path, message));

    /// <summary>
    /// Whether any error was reported.
    /// </summary>
    public bool HasErrors => _errors.Count > 0;

    /// <summary>
    /// The exception listing every error, sorted, in the format of <see cref="AppFilesLoader"/>.
    /// </summary>
    public ApplicationConfigException ToException() => AppFilesLoader.CannotLoad([.. _errors]);

    /// <summary>
    /// The diagnostics reported, sorted by path, then message.
    /// </summary>
    public ImmutableArray<AppFileDiagnostic> Diagnostics =>
        [.. _diagnostics.OrderBy(d => d.Path, StringComparer.Ordinal).ThenBy(d => d.Message, StringComparer.Ordinal)];
}
