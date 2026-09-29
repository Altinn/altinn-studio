using System.Xml;
using System.Xml.Linq;
using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// Checks that every <c>pdf</c> service task in <c>config/process/process.bpmn</c> has something the app
/// frontend can render. The frontend renders a PDF service task from exactly one of two sources: its own UI
/// folder (<c>ui/{taskId}</c>, using the folder's <c>pdfLayoutName</c> when set), or - when the task has no
/// UI folder - the tasks the backend passes as <c>task</c> query parameters, taken from
/// <c>autoPdfTaskIds</c>. See <c>PdfWrapper</c> and <c>PdfFromLayout</c> in the app frontend; the runtime
/// backstop is <c>PdfServiceTask</c> in Altinn.App.Core.
/// </summary>
internal static class PdfServiceTaskUtils
{
    private const string ProcessPath = "config/process/process.bpmn";
    private const string UiFolder = "ui/";
    private const string UiFolderSettingsSuffix = "/Settings.json";
    private const string PdfTaskType = "pdf";

    /// <summary>The namespaces the app runtime binds to when it reads the process.</summary>
    private static readonly XNamespace _bpmn = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    /// <inheritdoc cref="_bpmn"/>
    private static readonly XNamespace _altinn = "http://altinn.no/process";

    /// <summary>
    /// Appends a diagnostic for every <c>pdf</c> service task that cannot be rendered, and for every
    /// <c>autoPdfTaskIds</c> entry that would contribute nothing to its PDF.
    /// </summary>
    internal static void CollectDiagnostics(
        ImmutableArray<AdditionalText> additionalFiles,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        var processFile = SingleProcessFile(additionalFiles);
        var content = processFile?.GetText(token)?.ToString();
        if (processFile is null || content is null)
        {
            return;
        }

        XDocument document;
        try
        {
            document = XDocument.Parse(content, LoadOptions.SetLineInfo);
        }
        catch (XmlException)
        {
            // Nothing to reason about; the app itself fails to load the process at startup.
            return;
        }

        var uiFolders = FindUiFolders(additionalFiles, AppRoot(processFile));
        if (uiFolders.Count == 0)
        {
            // Every app with a form has at least one UI folder, so none at all means the UI files are not
            // visible to this analysis. Stay quiet rather than report every PDF task as unrenderable.
            return;
        }

        foreach (var pdfTask in FindPdfServiceTasks(document))
        {
            var location = FileLocationHelper.GetXmlElementLocation(processFile, content, pdfTask.Element);
            var hasOwnUiFolder = uiFolders.TryGetValue(pdfTask.Id, out var ownSettings);

            if (pdfTask.AutoPdfTaskIds.Count == 0)
            {
                if (!hasOwnUiFolder)
                {
                    diagnostics.Add(
                        Diagnostic.Create(Diagnostics.Process.PdfServiceTaskHasNothingToRender, location, pdfTask.Id)
                    );
                }

                continue;
            }

            if (hasOwnUiFolder)
            {
                // With a pdfLayoutName the frontend renders that layout and ignores the listed tasks, so there
                // is nothing more to check. Without one it rejects the task parameters outright.
                if (HasPdfLayoutName(ownSettings, token) is false)
                {
                    diagnostics.Add(
                        Diagnostic.Create(Diagnostics.Process.PdfServiceTaskConflictingContent, location, pdfTask.Id)
                    );
                }

                continue;
            }

            foreach (var taskId in pdfTask.AutoPdfTaskIds)
            {
                if (!uiFolders.ContainsKey(taskId))
                {
                    diagnostics.Add(
                        Diagnostic.Create(
                            Diagnostics.Process.PdfServiceTaskIncludesTaskWithoutUi,
                            location,
                            pdfTask.Id,
                            taskId
                        )
                    );
                }
            }
        }
    }

    /// <summary>
    /// The app's process file. More than one means a project layout this analysis cannot reason about, so it
    /// stays quiet rather than guessing.
    /// </summary>
    private static AdditionalText? SingleProcessFile(ImmutableArray<AdditionalText> additionalFiles)
    {
        AdditionalText? found = null;
        foreach (var file in additionalFiles)
        {
            if (!NormalizedPath(file).EndsWith(ProcessPath, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (found is not null)
            {
                return null;
            }

            found = file;
        }

        return found;
    }

    /// <summary>The app folder (with a trailing slash) that the process file sits in.</summary>
    private static string AppRoot(AdditionalText processFile)
    {
        var path = NormalizedPath(processFile);
        return path.Substring(0, path.Length - ProcessPath.Length);
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
            var path = NormalizedPath(file);
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
        foreach (var taskType in document.Descendants(_altinn + "taskType"))
        {
            if (!string.Equals(taskType.Value.Trim(), PdfTaskType, StringComparison.Ordinal))
            {
                continue;
            }

            var serviceTask = taskType.Ancestors().FirstOrDefault(a => a.Name == _bpmn + "serviceTask");
            if (serviceTask?.Attribute("id")?.Value is not { Length: > 0 } id)
            {
                continue;
            }

            // The runtime binds autoPdfTaskIds under the task extension that declares the task type. Blank
            // entries render nothing, so they do not count as listing a task.
            var autoPdfTaskIds =
                taskType
                    .Parent?.Element(_altinn + "pdfConfig")
                    ?.Element(_altinn + "autoPdfTaskIds")
                    ?.Elements(_altinn + "taskId")
                    .Select(e => e.Value)
                    .Where(v => !string.IsNullOrWhiteSpace(v))
                    .ToList()
                ?? [];

            yield return new PdfServiceTask(id, serviceTask, autoPdfTaskIds);
        }
    }

    /// <summary>
    /// Whether the UI folder's settings set <c>pages.pdfLayoutName</c>, or null when the file cannot be read -
    /// so a malformed file never produces a diagnostic about its content.
    /// </summary>
    private static bool? HasPdfLayoutName(AdditionalText? settingsFile, CancellationToken token)
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

            var pages = settings.GetProperty("pages");
            var pdfLayoutName = pages?.Type == JsonType.Object ? pages.GetProperty("pdfLayoutName") : null;
            return pdfLayoutName?.Type == JsonType.String && !string.IsNullOrWhiteSpace(pdfLayoutName.GetString());
        }
        catch (NanoJsonException)
        {
            return null;
        }
    }

    private static string NormalizedPath(AdditionalText file) => file.Path.Replace('\\', '/');

    /// <param name="Id">The service task's BPMN element id, which is also the name of its UI folder.</param>
    /// <param name="Element">The <c>bpmn:serviceTask</c> element, which anchors the diagnostics.</param>
    /// <param name="AutoPdfTaskIds">The non-blank <c>autoPdfTaskIds</c> entries.</param>
    private sealed record PdfServiceTask(string Id, XElement Element, List<string> AutoPdfTaskIds);
}
