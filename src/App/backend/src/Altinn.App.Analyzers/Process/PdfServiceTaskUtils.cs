using System.Xml;
using System.Xml.Linq;
using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// Checks that every <c>pdf</c> service task in <c>config/process/process.bpmn</c> has something the app
/// frontend can render. The frontend renders a PDF service task from exactly one of two sources: the layout that
/// the <c>pdfLayoutName</c> of its own UI folder (<c>ui/{taskId}</c>) names, or - when the task has no UI folder -
/// the tasks the backend passes as <c>task</c> query parameters, taken from <c>autoPdfTaskIds</c>. See
/// <c>PdfWrapper</c> and <c>PdfFromLayout</c> in the app frontend; the runtime backstop is <c>PdfServiceTask</c>
/// in Altinn.App.Core.
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
    /// Appends a diagnostic for every <c>pdf</c> service task that does not say what to render as its PDF, and for
    /// every <c>autoPdfTaskIds</c> entry that would contribute nothing to its PDF.
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

        // The package props that expose config/** to the analysis expose ui/**/*.json as well, so no UI folders
        // here means the app has none.
        var uiFolders = FindUiFolders(additionalFiles, AppRoot(processFile));

        foreach (var pdfTask in FindPdfServiceTasks(document))
        {
            var location = FileLocationHelper.GetXmlElementLocation(processFile, content, pdfTask.Element);
            var hasOwnUiFolder = uiFolders.TryGetValue(pdfTask.Id, out var ownSettings);

            if (hasOwnUiFolder)
            {
                // The folder's pages are what people see while the process is at the task, so only
                // pdfLayoutName says which layout is the PDF. The frontend then renders that layout and ignores
                // autoPdfTaskIds. Without one it renders the folder's pages instead, or rejects the task
                // parameters outright when autoPdfTaskIds lists any.
                if (HasPdfLayoutName(ownSettings, token) is false)
                {
                    diagnostics.Add(
                        Diagnostic.Create(Diagnostics.Process.PdfServiceTaskMissingPdfLayoutName, location, pdfTask.Id)
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

            // The app backend reads Settings.json ignoring property case and hands the result to the frontend.
            var pages = settings.GetPropertyIgnoreCase("pages");
            var pdfLayoutName = pages?.Type == JsonType.Object ? pages.GetPropertyIgnoreCase("pdfLayoutName") : null;
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
