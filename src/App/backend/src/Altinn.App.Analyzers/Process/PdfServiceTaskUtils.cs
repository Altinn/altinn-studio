using System.Xml.Linq;
using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// Checks that every <c>pdf</c> service task in <c>config/process/process.bpmn</c> has something the app
/// frontend can render. The frontend renders a PDF service task from exactly one of two sources: the layout that
/// the <c>pdfLayoutName</c> of its own UI folder (<c>ui/{taskId}</c>) names, or - when that is not set - the tasks
/// the backend passes as <c>task</c> query parameters, taken from <c>autoPdfTaskIds</c>. See <c>PdfWrapper</c> and
/// <c>PdfFromLayout</c> in the app frontend; the runtime backstop is <c>PdfServiceTask</c> in Altinn.App.Core.
/// </summary>
internal static class PdfServiceTaskUtils
{
    private const string UiFolder = "ui/";
    private const string UiFolderSettingsSuffix = "/Settings.json";
    private const string PdfTaskType = "pdf";

    /// <summary>
    /// Appends a diagnostic for every <c>pdf</c> service task that does not say what to render as its PDF or names a
    /// layout its UI folder does not have, and for every <c>autoPdfTaskIds</c> entry that would contribute nothing to
    /// its PDF.
    /// </summary>
    internal static void CollectDiagnostics(
        ImmutableArray<AdditionalText> additionalFiles,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        var processFile = ProcessFile.FindSingle(additionalFiles);
        if (processFile is null || ProcessFile.TryParse(processFile, token) is not { } parsed)
        {
            return;
        }

        var (content, document) = parsed;

        // The package props that expose config/** to the analysis expose ui/**/*.json as well, so no UI folders
        // here means the app has none.
        var appRoot = AppRoot(processFile);
        var uiFolders = FindUiFolders(additionalFiles, appRoot);

        foreach (var pdfTask in FindPdfServiceTasks(document))
        {
            var location = FileLocationHelper.GetXmlElementLocation(processFile, content, pdfTask.Element);

            // pdfLayoutName names the layout to render, and the frontend then ignores autoPdfTaskIds. The pages
            // in the folder's order are what people see while the process is at the task, never the PDF. A
            // Settings.json that cannot be read is left alone.
            var pdfLayoutName = uiFolders.TryGetValue(pdfTask.Id, out var ownSettings)
                ? ReadPdfLayoutName(ownSettings, token)
                : "";
            if (pdfLayoutName is null)
            {
                continue;
            }

            if (pdfLayoutName.Length > 0)
            {
                if (!HasLayout(additionalFiles, appRoot, pdfTask.Id, pdfLayoutName))
                {
                    diagnostics.Add(
                        Diagnostic.Create(
                            Diagnostics.Process.PdfServiceTaskPdfLayoutNotFound,
                            location,
                            pdfTask.Id,
                            pdfLayoutName
                        )
                    );
                }

                continue;
            }

            if (pdfTask.AutoPdfTaskIds.Count == 0)
            {
                diagnostics.Add(
                    Diagnostic.Create(Diagnostics.Process.PdfServiceTaskHasNothingToRender, location, pdfTask.Id)
                );
                continue;
            }

            void ReportEntryThatAddsNothing(string entry, string reason) =>
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Process.PdfServiceTaskIncludesEntryThatAddsNothing,
                        location,
                        pdfTask.Id,
                        entry,
                        reason
                    )
                );

            if (pdfTask.HasBlankAutoPdfTaskId)
            {
                ReportEntryThatAddsNothing("a blank task id", "it names no task");
            }

            foreach (var taskId in pdfTask.AutoPdfTaskIds)
            {
                if (taskId == pdfTask.Id)
                {
                    ReportEntryThatAddsNothing(
                        "itself",
                        "its own UI folder holds what people see while the process is at the task"
                    );
                }
                else if (!uiFolders.ContainsKey(taskId))
                {
                    ReportEntryThatAddsNothing($"'{taskId}'", $"there is no UI folder 'ui/{taskId}'");
                }
            }
        }
    }

    /// <summary>The app folder (with a trailing slash) that the process file sits in.</summary>
    private static string AppRoot(AdditionalText processFile)
    {
        var path = ProcessFile.NormalizedPath(processFile);
        return path.Substring(0, path.Length - ProcessFile.RelativePath.Length);
    }

    /// <summary>
    /// The app's UI folders by name, mapped to their <c>Settings.json</c>. Like the app backend, only direct
    /// subfolders of <c>ui/</c> with a <c>Settings.json</c> count; <c>ui/Settings.json</c> itself holds the
    /// global settings.
    /// </summary>
    private static Dictionary<string, AdditionalText> FindUiFolders(
        ImmutableArray<AdditionalText> additionalFiles,
        string appRoot
    )
    {
        var uiRoot = appRoot + UiFolder;
        var folders = new Dictionary<string, AdditionalText>(StringComparer.Ordinal);
        foreach (var file in additionalFiles)
        {
            var path = ProcessFile.NormalizedPath(file);
            if (!path.StartsWith(uiRoot, StringComparison.Ordinal))
            {
                continue;
            }

            var relative = path.Substring(uiRoot.Length);
            if (!relative.EndsWith(UiFolderSettingsSuffix, StringComparison.Ordinal))
            {
                continue;
            }

            var folder = relative.Substring(0, relative.Length - UiFolderSettingsSuffix.Length);
            if (folder.Length > 0 && folder.IndexOf('/') < 0)
            {
                folders[folder] = file;
            }
        }

        return folders;
    }

    private static IEnumerable<PdfServiceTask> FindPdfServiceTasks(XDocument document)
    {
        foreach (var taskType in document.Descendants(ProcessFile.Altinn + "taskType"))
        {
            if (!string.Equals(taskType.Value.Trim(), PdfTaskType, StringComparison.Ordinal))
            {
                continue;
            }

            // A pdf task on a bpmn:task element is reported by ProcessTaskElementAnalyzer, and is checked here as well,
            // so changing its element does not uncover more errors.
            var task = ProcessFile.FindHostingTask(taskType);
            if (task?.Attribute("id")?.Value is not { Length: > 0 } id)
            {
                continue;
            }

            // The runtime binds autoPdfTaskIds under the task extension that declares the task type. Blank
            // entries render nothing, so they do not count as listing a task.
            var entries =
                taskType
                    .Parent?.Element(ProcessFile.Altinn + "pdfConfig")
                    ?.Element(ProcessFile.Altinn + "autoPdfTaskIds")
                    ?.Elements(ProcessFile.Altinn + "taskId")
                    .Select(e => e.Value)
                    .ToList()
                ?? [];
            var autoPdfTaskIds = entries.Where(v => !string.IsNullOrWhiteSpace(v)).ToList();

            yield return new PdfServiceTask(id, task, autoPdfTaskIds, autoPdfTaskIds.Count < entries.Count);
        }
    }

    /// <summary>
    /// Whether the UI folder has the layout <c>ui/{folder}/layouts/{page}.json</c>. The frontend looks the page up
    /// by its exact name.
    /// </summary>
    private static bool HasLayout(
        ImmutableArray<AdditionalText> additionalFiles,
        string appRoot,
        string folder,
        string page
    )
    {
        var layoutPath = $"{appRoot}{UiFolder}{folder}/layouts/{page}.json";
        return additionalFiles.Any(file =>
            string.Equals(ProcessFile.NormalizedPath(file), layoutPath, StringComparison.Ordinal)
        );
    }

    /// <summary>
    /// The UI folder's <c>pages.pdfLayoutName</c>, an empty string when it sets none, or null when the file cannot
    /// be read - so a malformed file never produces a diagnostic about its content.
    /// </summary>
    private static string? ReadPdfLayoutName(AdditionalText? settingsFile, CancellationToken token)
    {
        var content = settingsFile?.GetText(token)?.ToString();
        if (content is null)
        {
            return null;
        }

        try
        {
            var settings = JsonValue.Parse(content);
            if (settings.Type != JsonType.Object)
            {
                return null;
            }

            // The app backend reads Settings.json ignoring property case and hands the result to the frontend.
            var pages = settings.GetPropertyIgnoreCase("pages");
            var pdfLayoutName = pages?.Type == JsonType.Object ? pages.GetPropertyIgnoreCase("pdfLayoutName") : null;
            return pdfLayoutName?.Type == JsonType.String && !string.IsNullOrWhiteSpace(pdfLayoutName.GetString())
                ? pdfLayoutName.GetString()
                : "";
        }
        catch (NanoJsonException)
        {
            return null;
        }
    }

    /// <param name="Id">The service task's BPMN element id, which is also the name of its UI folder.</param>
    /// <param name="Element">
    /// The <c>bpmn:serviceTask</c> or <c>bpmn:task</c> element, which anchors the diagnostics.
    /// </param>
    /// <param name="AutoPdfTaskIds">The non-blank <c>autoPdfTaskIds</c> entries.</param>
    /// <param name="HasBlankAutoPdfTaskId">Whether <c>autoPdfTaskIds</c> has a blank entry as well.</param>
    private sealed record PdfServiceTask(
        string Id,
        XElement Element,
        List<string> AutoPdfTaskIds,
        bool HasBlankAutoPdfTaskId
    );
}
