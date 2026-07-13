using System.Text;
using System.Xml;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.ParkedServiceTaskMigration;

/// <summary>
/// Coordinates the migration of processes designed for v8's auto-advancing <c>fiksArkiv</c> and
/// <c>eFormidling</c> service tasks. In v9 these tasks park until their asynchronous reply arrives
/// and the reply advances them directly, so the <c>feedback</c> waiting steps v8 processes placed
/// after them are never advanced by anything - an instance reaching one would be stuck forever.
/// Provably-safe shapes are rewritten; everything else gets a warning and manual follow-up. See
/// <see cref="ParkedServiceTaskProcessRewriter"/> for the shape analysis.
/// </summary>
internal sealed class ParkedServiceTaskMigrator
{
    private readonly string _projectFolder;
    private readonly List<string> _notes = new();

    public ParkedServiceTaskMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    /// <summary>
    /// Informational messages (behaviour notes and applied removals) the caller should print as
    /// regular output - they are not warnings.
    /// </summary>
    public IReadOnlyList<string> GetNotes() => _notes;

    /// <summary>
    /// Runs the migration. The result carries any warnings and whether manual follow-up is required
    /// (a waiting-step shape that could not be rewritten safely). No warnings and no manual action
    /// means a clean migration (or nothing to migrate).
    /// </summary>
    public async Task<MigrationResult> Migrate()
    {
        var warnings = new List<string>();

        var processFile = AppFiles.Resolve(_projectFolder, "config/process/process.bpmn");
        if (processFile is null)
        {
            // No process, no parked service tasks - nothing to migrate.
            return new MigrationResult(ManualActionRequired: false, warnings);
        }

        ParkedServiceTaskProcessRewriter rewriter;
        try
        {
            rewriter = new ParkedServiceTaskProcessRewriter(processFile);
        }
        catch (DecoderFallbackException)
        {
            warnings.Add(
                "config/process/process.bpmn is not valid UTF-8 (it may use a legacy encoding such as "
                    + "ISO-8859-1); skipped the waiting-step analysis for fiksArkiv/eFormidling service tasks. "
                    + "Convert the file to UTF-8 and re-run the upgrade."
            );
            return new MigrationResult(ManualActionRequired: true, warnings);
        }
        catch (XmlException ex)
        {
            warnings.Add(
                $"config/process/process.bpmn is not valid XML ({ex.Message}); skipped the waiting-step "
                    + "analysis for fiksArkiv/eFormidling service tasks. Fix the file and re-run the upgrade."
            );
            return new MigrationResult(ManualActionRequired: true, warnings);
        }

        rewriter.RemoveRedundantWaitSteps();
        warnings.AddRange(rewriter.GetWarnings());
        _notes.AddRange(rewriter.GetNotes());

        if (rewriter.HasChanges)
            await rewriter.Write();

        // A removed waiting step may leave a task UI folder (and text resources) behind. Deleting
        // user content is out of scope for an automated upgrade - point at it instead.
        foreach (var removedTaskId in rewriter.RemovedFeedbackTaskIds)
        {
            if (FindUiFolder(removedTaskId) is { } uiFolder)
            {
                warnings.Add(
                    $"The removed waiting step '{removedTaskId}' still has a UI folder ('{uiFolder}'), which is "
                        + "now unused. Delete it (and any text resources that only served this step) if it is "
                        + "no longer wanted."
                );
            }
        }

        return new MigrationResult(rewriter.ManualActionRequired, warnings);
    }

    /// <summary>
    /// Locates the task's UI folder, tolerating both the <c>{root}/App/ui/...</c> and
    /// <c>{root}/ui/...</c> layouts (mirroring <see cref="AppFiles.Resolve"/>). Returns the path
    /// relative to the project folder, or null when absent.
    /// </summary>
    private string? FindUiFolder(string taskId)
    {
        foreach (var candidate in new[] { Path.Combine("App", "ui", taskId), Path.Combine("ui", taskId) })
        {
            if (Directory.Exists(Path.Combine(_projectFolder, candidate)))
                return candidate;
        }

        return null;
    }
}
