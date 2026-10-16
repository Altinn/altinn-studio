using System.Text;
using System.Text.Json;
using System.Xml;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>
/// Coordinates the migration away from the deprecated <c>enablePdfCreation</c> flag: adds a <c>pdf</c>
/// service task to the process for each task that relied on it, then strips the flag from
/// applicationmetadata.json. See <see cref="ApplicationMetadataPdfRewriter"/> for the legacy semantics.
///
/// A task whose settings name a custom PDF layout (<c>pages.pdfLayoutName</c>) had its legacy PDF
/// rendered from that layout, which a service task in automatic mode (<c>autoPdfTaskIds</c>) ignores.
/// Its service task gets a layout set of its own instead, as Altinn Studio sets up a custom PDF: the PDF
/// layout, with its summaries pointing at the task, and a waiting page. The frontend renders a service
/// task with a UI folder like a data task's own PDF. When the PDF layout refers to other content of the
/// task folder, the service task gets a copy of the whole folder, which renders the PDF as before, and a
/// to-do asks for the rest of the conversion. Either way the task's own PDF layout is then unused, and is
/// removed when nothing else needs it (see <see cref="SourcePdfLayoutRemoval"/>).
/// </summary>
internal sealed class PdfServiceTaskMigrator
{
    private readonly string _projectFolder;

    public PdfServiceTaskMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    /// <summary>
    /// Runs the migration. The result carries any warnings, plus a to-do when manual follow-up is
    /// required (e.g. a task that could not be migrated left the legacy flag in place). No warnings and
    /// no to-dos means a clean migration.
    /// </summary>
    public async Task<MigrationResult> Migrate()
    {
        var messages = new List<UpgradeMessage>();

        var metadataFile = AppFiles.Resolve(_projectFolder, "config/applicationmetadata.json");
        if (metadataFile is null)
        {
            // Nothing to migrate and no flag left behind, so no manual follow-up is implied.
            messages.Warn("Could not find config/applicationmetadata.json; skipped PDF service task migration.");
            return new MigrationResult(messages);
        }

        var metadataRewriter = new ApplicationMetadataPdfRewriter(metadataFile);

        IReadOnlyList<(string TaskId, string? DataTypeId)> tasks;
        try
        {
            tasks = metadataRewriter.GetTasksRequiringPdf();
        }
        catch (DecoderFallbackException)
        {
            messages.Todo(
                "config/applicationmetadata.json is not valid UTF-8 (it may use a legacy encoding such as "
                    + "ISO-8859-1); skipped PDF service task migration. Convert the file to UTF-8 and re-run "
                    + "the upgrade."
            );
            return new MigrationResult(messages);
        }
        catch (JsonException ex)
        {
            messages.Todo(
                $"config/applicationmetadata.json is not valid JSON ({ex.Message}); skipped PDF service task "
                    + "migration. Fix the file and re-run the upgrade."
            );
            return new MigrationResult(messages);
        }

        if (tasks.Count > 0)
        {
            var processFile = AppFiles.Resolve(_projectFolder, "config/process/process.bpmn");
            if (processFile is null)
            {
                messages.Todo(
                    "applicationmetadata.json enables PDF creation, but config/process/process.bpmn was not "
                        + "found; cannot add PDF service task(s). Left applicationmetadata.json unchanged."
                );
                return new MigrationResult(messages);
            }

            PdfProcessRewriter processRewriter;
            try
            {
                processRewriter = new PdfProcessRewriter(processFile);
            }
            catch (DecoderFallbackException)
            {
                messages.Todo(
                    "config/process/process.bpmn is not valid UTF-8 (it may use a legacy encoding such as "
                        + "ISO-8859-1); cannot add PDF service task(s). Left applicationmetadata.json unchanged. "
                        + "Convert the file to UTF-8 and re-run the upgrade."
                );
                return new MigrationResult(messages);
            }
            catch (XmlException ex)
            {
                messages.Todo(
                    $"config/process/process.bpmn is not valid XML ({ex.Message}); cannot add PDF service "
                        + "task(s). Left applicationmetadata.json unchanged. Fix the file and re-run the upgrade."
                );
                return new MigrationResult(messages);
            }

            // Decide how each task's PDF must render before changing anything. A task whose legacy PDF
            // came from a custom layout gets a layout set of its own for its PDF service task.
            var layoutResolver = new SourceTaskPdfLayoutResolver(_projectFolder);
            var pdfTaskUis = new Dictionary<string, (SourceTaskPdfLayout.Custom Source, PdfTaskUi Ui)>(
                StringComparer.Ordinal
            );
            var blockedTasks = new HashSet<string>(StringComparer.Ordinal);
            foreach (var (taskId, dataTypeId) in tasks)
            {
                switch (layoutResolver.Resolve(taskId))
                {
                    case SourceTaskPdfLayout.Unresolved unresolved:
                        messages.Warn(unresolved.Reason);
                        blockedTasks.Add(taskId);
                        break;
                    case SourceTaskPdfLayout.Custom custom when processRewriter.HasPdfServiceTaskFor(taskId):
                        // Inserted by an earlier run, which gave it its folder too - unless that run
                        // predates custom PDF layout support and put the task in automatic mode.
                        if (!Directory.Exists(custom.PdfTaskUiFolder))
                            messages.Todo(ExistingPdfTaskIgnoresLayout(layoutResolver, taskId, custom));
                        break;
                    case SourceTaskPdfLayout.Custom custom:
                        var ui = PlanPdfTaskUi(layoutResolver, taskId, dataTypeId, custom);
                        if (ui is PdfTaskUi.Unresolved unresolvedUi)
                        {
                            messages.Warn(unresolvedUi.Reason);
                            blockedTasks.Add(taskId);
                        }
                        else
                        {
                            pdfTaskUis[taskId] = (custom, ui);
                        }
                        break;
                }
            }

            processRewriter.InsertPdfServiceTasks(
                [.. tasks.Where(t => !blockedTasks.Contains(t.TaskId))],
                pdfTaskUis.Keys.ToHashSet(StringComparer.Ordinal)
            );

            // Write each PDF service task's folder before the process: a folder no task uses yet is inert,
            // while a PDF service task without its folder would fail to render. A write interrupted here is
            // completed by a re-run (see UiFolderFiles).
            var written = new List<(string TaskId, SourceTaskPdfLayout.Custom Source, PdfTaskUi Ui)>();
            foreach (var taskId in processRewriter.GetInsertedTasks())
            {
                if (pdfTaskUis.TryGetValue(taskId, out var pdfTaskUi) && FilesOf(pdfTaskUi.Ui) is { } files)
                {
                    files.WriteTo(pdfTaskUi.Source.PdfTaskUiFolder);
                    written.Add((taskId, pdfTaskUi.Source, pdfTaskUi.Ui));
                }
            }

            // Only write when something changed; a run where every insertion was skipped or already
            // satisfied must not reformat the file for nothing.
            if (processRewriter.HasChanges)
                await processRewriter.Write();
            messages.WarnRange(processRewriter.GetWarnings());

            // Only now that their PDF service tasks render the PDFs are the data tasks' own PDF layouts unused.
            foreach (var (taskId, source, ui) in written)
            {
                var removal = await SourcePdfLayoutRemoval.Remove(source, layoutResolver.DisplayPath);
                switch (ui)
                {
                    case PdfTaskUi.OwnLayoutSet layoutSet:
                        messages.Warn(GaveOwnLayoutSet(layoutResolver, taskId, source, removal));
                        if (layoutSet.Retargeting.ConvertedSummaries.Count > 0)
                            messages.Warn(ConvertedSummaries(layoutResolver, source, layoutSet.Retargeting));
                        break;
                    case PdfTaskUi.TaskFolderCopy copy:
                        messages.Todo(CopiedTaskFolder(layoutResolver, taskId, source, copy.Blockers, removal));
                        break;
                }
            }

            // If any insertion was skipped, keep the legacy flag: stripping it now would leave the
            // app with neither the v8 flag nor the v9 service task (silently dropping PDF generation),
            // and the analyzer error is what tells the developer the migration needs manual work. A task
            // that relied on the flag's implicit default has no flag to keep, so the to-do is its only
            // signal. Successful insertions are kept; a re-run treats them as already migrated, so the
            // flag is stripped once the remaining task(s) have been handled manually.
            var skippedTasks = tasks
                .Select(t => t.TaskId)
                .Where(taskId => blockedTasks.Contains(taskId) || processRewriter.GetSkippedTasks().Contains(taskId))
                .ToList();
            if (skippedTasks.Count > 0)
            {
                messages.Todo(
                    $"Could not insert the PDF service task(s) for [{string.Join(", ", skippedTasks)}] "
                        + "automatically, so these tasks generate no PDF in v9. Left applicationmetadata.json "
                        + "unchanged. Resolve the problems reported above (or add the service task(s) manually) "
                        + "and re-run the upgrade."
                );
                return new MigrationResult(messages);
            }
        }

        // Strip the flag last, so a failure inserting service tasks above leaves metadata untouched.
        await metadataRewriter.StripEnablePdfCreation();
        messages.WarnRange(metadataRewriter.GetWarnings());

        // The rewriter leaves the flag in place when it can't strip it safely (unusual formatting, or
        // a result that would not parse); that too is manual follow-up.
        if (metadataRewriter.ManualActionRequired)
        {
            messages.Todo("PDF service task migration needs manual follow-up. Review the warnings above.");
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// Plans the UI folder of the PDF service task for <paramref name="taskId"/>, or says why it cannot be
    /// made (as <see cref="PdfTaskUi.Unresolved"/>).
    /// </summary>
    private static PdfTaskUi PlanPdfTaskUi(
        SourceTaskPdfLayoutResolver layoutResolver,
        string taskId,
        string? dataTypeId,
        SourceTaskPdfLayout.Custom custom
    )
    {
        var ui = PdfTaskUiPlanner.Plan(taskId, custom, dataTypeId, layoutResolver.DisplayPath);
        if (FilesOf(ui) is not { } files || files.CanWriteTo(custom.PdfTaskUiFolder))
            return ui;

        return new PdfTaskUi.Unresolved(
            $"Task '{taskId}' renders its PDF from the custom layout '{custom.PdfLayoutName}' (pages.pdfLayoutName), "
                + "so its PDF service task needs a layout set of its own in "
                + $"{layoutResolver.DisplayPath(custom.PdfTaskUiFolder)}, but that folder already exists with other "
                + "content. Skipped PDF service task insertion - move that folder aside and re-run the upgrade."
        );
    }

    private static UiFolderFiles? FilesOf(PdfTaskUi ui) =>
        ui switch
        {
            PdfTaskUi.OwnLayoutSet layoutSet => layoutSet.Files,
            PdfTaskUi.TaskFolderCopy copy => copy.Files,
            _ => null,
        };

    /// <param name="removal">What became of the task's own PDF layout.</param>
    private static string GaveOwnLayoutSet(
        SourceTaskPdfLayoutResolver layoutResolver,
        string taskId,
        SourceTaskPdfLayout.Custom custom,
        string removal
    ) =>
        $"Task '{taskId}' renders its PDF from the custom layout '{custom.PdfLayoutName}' (pages.pdfLayoutName), "
        + "which a PDF service task in automatic mode (autoPdfTaskIds) would ignore. Gave PDF service task "
        + $"'{PdfProcessRewriter.PdfTaskIdFor(taskId)}' a layout set of its own in "
        + $"{layoutResolver.DisplayPath(custom.PdfTaskUiFolder)}, as Altinn Studio sets up a custom PDF: "
        + $"layouts/{custom.PdfLayoutName}.json, with its summaries pointing at task '{taskId}' (target.taskId), "
        + $"and a waiting page. {removal}";

    private static string ConvertedSummaries(
        SourceTaskPdfLayoutResolver layoutResolver,
        SourceTaskPdfLayout.Custom custom,
        PdfLayoutRetargetingResult retargeting
    )
    {
        var file = layoutResolver.DisplayPath(
            Path.Combine(custom.PdfTaskUiFolder, "layouts", $"{custom.PdfLayoutName}.json")
        );
        var message =
            $"Converted the legacy Summary component(s) [{string.Join(", ", retargeting.ConvertedSummaries)}] in "
            + $"{file} to Summary2, since Summary is deprecated and cannot show another task's components. They "
            + "summarize the same components, but may look different in the PDF, so review it.";
        if (retargeting.ConvertedExcludedChildren)
            message += " excludedChildren became overrides that hide those children.";
        if (retargeting.DroppedProperties.Count > 0)
            message +=
                $" Dropped {string.Join(", ", retargeting.DroppedProperties)}, which Summary2 has no counterpart for.";
        return message;
    }

    /// <param name="removal">What became of the task's own PDF layout.</param>
    private static string CopiedTaskFolder(
        SourceTaskPdfLayoutResolver layoutResolver,
        string taskId,
        SourceTaskPdfLayout.Custom custom,
        IReadOnlyList<string> blockers,
        string removal
    ) =>
        $"Task '{taskId}' renders its PDF from the custom layout '{custom.PdfLayoutName}' (pages.pdfLayoutName), "
        + $"which refers to content only the task's own folder has: {string.Join("; ", blockers)}. So that the PDF "
        + $"keeps working, copied {layoutResolver.DisplayPath(custom.UiFolder)} to "
        + $"{layoutResolver.DisplayPath(custom.PdfTaskUiFolder)}, which PDF service task "
        + $"'{PdfProcessRewriter.PdfTaskIdFor(taskId)}' renders the PDF from. {removal} Replace the copy with the layout set "
        + $"Altinn Studio uses for a custom PDF ({V9MigrationDocs.Pdf}): keep only layouts/{custom.PdfLayoutName}.json "
        + "and a waiting page, layouts/ServiceTask.json, listed alone in pages.order (keep pdfLayoutName and "
        + $"defaultDataType); point each Summary2 at task '{taskId}' with target.taskId, replace Summary components "
        + "with Summary2, and rework what is listed above.";

    private static string ExistingPdfTaskIgnoresLayout(
        SourceTaskPdfLayoutResolver layoutResolver,
        string taskId,
        SourceTaskPdfLayout.Custom custom
    )
    {
        var pdfTaskId = PdfProcessRewriter.PdfTaskIdFor(taskId);
        return $"PDF service task '{pdfTaskId}' already exists without a layout set of its own, so it does not "
            + $"render the custom layout '{custom.PdfLayoutName}' (pages.pdfLayoutName in "
            + $"{layoutResolver.DisplayPath(custom.UiFolder)}) that task '{taskId}' rendered its PDF from before the "
            + $"upgrade. To keep that PDF, give it the layout set Altinn Studio uses for a custom PDF "
            + $"({V9MigrationDocs.Pdf}): {layoutResolver.DisplayPath(custom.PdfTaskUiFolder)} with "
            + $"layouts/{custom.PdfLayoutName}.json, whose Summary2 components point at task '{taskId}' with "
            + "target.taskId (replace Summary components with Summary2), a waiting page, layouts/ServiceTask.json, and "
            + $"a Settings.json with pdfLayoutName '{custom.PdfLayoutName}', pages.order [\"ServiceTask\"] and "
            + $"defaultDataType. Then remove autoPdfTaskIds from '{pdfTaskId}'.";
    }
}
