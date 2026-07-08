using System.Text;
using System.Text.Json;
using System.Xml;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>
/// Coordinates the migration away from the deprecated <c>enablePdfCreation</c> flag: adds a <c>pdf</c>
/// service task to the process for each task that relied on it, then strips the flag from
/// applicationmetadata.json. See <see cref="ApplicationMetadataPdfRewriter"/> for the legacy semantics.
/// </summary>
internal sealed class PdfServiceTaskMigrator
{
    private readonly string _projectFolder;

    public PdfServiceTaskMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    /// <summary>
    /// Runs the migration. The result carries any warnings and whether manual follow-up is required
    /// (e.g. a task that could not be migrated left the legacy flag in place). No warnings and no
    /// manual action means a clean migration.
    /// </summary>
    public async Task<MigrationResult> Migrate()
    {
        var warnings = new List<string>();

        var metadataFile = AppFiles.Resolve(_projectFolder, "config/applicationmetadata.json");
        if (metadataFile is null)
        {
            // Nothing to migrate and no flag left behind, so no manual follow-up is implied.
            warnings.Add("Could not find config/applicationmetadata.json; skipped PDF service task migration.");
            return new MigrationResult(ManualActionRequired: false, warnings);
        }

        var metadataRewriter = new ApplicationMetadataPdfRewriter(metadataFile);

        IReadOnlyList<(string TaskId, string? DataTypeId)> tasks;
        try
        {
            tasks = metadataRewriter.GetTasksRequiringPdf();
        }
        catch (DecoderFallbackException)
        {
            warnings.Add(
                "config/applicationmetadata.json is not valid UTF-8 (it may use a legacy encoding such as "
                    + "ISO-8859-1); skipped PDF service task migration. Convert the file to UTF-8 and re-run "
                    + "the upgrade."
            );
            return new MigrationResult(ManualActionRequired: true, warnings);
        }
        catch (JsonException ex)
        {
            warnings.Add(
                $"config/applicationmetadata.json is not valid JSON ({ex.Message}); skipped PDF service task "
                    + "migration. Fix the file and re-run the upgrade."
            );
            return new MigrationResult(ManualActionRequired: true, warnings);
        }

        if (tasks.Count > 0)
        {
            var processFile = AppFiles.Resolve(_projectFolder, "config/process/process.bpmn");
            if (processFile is null)
            {
                warnings.Add(
                    "applicationmetadata.json enables PDF creation, but config/process/process.bpmn was not "
                        + "found; cannot add PDF service task(s). Left applicationmetadata.json unchanged."
                );
                return new MigrationResult(ManualActionRequired: true, warnings);
            }

            PdfProcessRewriter processRewriter;
            try
            {
                processRewriter = new PdfProcessRewriter(processFile);
            }
            catch (DecoderFallbackException)
            {
                warnings.Add(
                    "config/process/process.bpmn is not valid UTF-8 (it may use a legacy encoding such as "
                        + "ISO-8859-1); cannot add PDF service task(s). Left applicationmetadata.json unchanged. "
                        + "Convert the file to UTF-8 and re-run the upgrade."
                );
                return new MigrationResult(ManualActionRequired: true, warnings);
            }
            catch (XmlException ex)
            {
                warnings.Add(
                    $"config/process/process.bpmn is not valid XML ({ex.Message}); cannot add PDF service "
                        + "task(s). Left applicationmetadata.json unchanged. Fix the file and re-run the upgrade."
                );
                return new MigrationResult(ManualActionRequired: true, warnings);
            }

            processRewriter.InsertPdfServiceTasks(tasks);
            // Only write when something changed; a run where every insertion was skipped or already
            // satisfied must not reformat the file for nothing.
            if (processRewriter.HasChanges)
                await processRewriter.Write();
            warnings.AddRange(processRewriter.GetWarnings());

            // If any insertion was skipped, keep the legacy flag: stripping it now would leave the
            // app with neither the v8 flag nor the v9 service task (silently dropping PDF generation),
            // and the analyzer error is what tells the developer the migration needs manual work.
            // Successful insertions are kept; a re-run treats them as already migrated, so the flag
            // is stripped once the remaining task(s) have been handled manually.
            IReadOnlyList<string> skippedTasks = processRewriter.GetSkippedTasks();
            if (skippedTasks.Count > 0)
            {
                warnings.Add(
                    $"Left enablePdfCreation in applicationmetadata.json unchanged because the PDF service "
                        + $"task(s) for [{string.Join(", ", skippedTasks)}] could not be inserted automatically. "
                        + "Add the service task(s) manually (or fix the process) and re-run the upgrade to "
                        + "strip the flag."
                );
                return new MigrationResult(ManualActionRequired: true, warnings);
            }
        }

        // Strip the flag last, so a failure inserting service tasks above leaves metadata untouched.
        await metadataRewriter.StripEnablePdfCreation();
        warnings.AddRange(metadataRewriter.GetWarnings());

        // The rewriter leaves the flag in place when it can't strip it safely (unusual formatting, or
        // a result that would not parse); that too is manual follow-up.
        return new MigrationResult(metadataRewriter.ManualActionRequired, warnings);
    }
}
