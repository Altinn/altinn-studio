using System.Xml;
using System.Xml.Linq;
using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// Checks that the PDF service tasks in <c>config/process/process.bpmn</c> have something the app frontend can
/// render. A <c>pdf</c> service task is rendered from exactly one of two sources: its own UI folder
/// (<c>ui/{taskId}</c>, using the folder's <c>pdfLayoutName</c> when set), or - when the task has no UI folder -
/// the tasks the backend passes as <c>task</c> query parameters, taken from <c>autoPdfTaskIds</c>. See
/// <c>PdfWrapper</c> and <c>PdfFromLayout</c> in the app frontend; the runtime backstop is <c>PdfServiceTask</c> in
/// Altinn.App.Core. <c>subformPdf</c> service tasks are checked by <see cref="SubformPdfServiceTaskUtils"/>.
/// </summary>
internal static class PdfServiceTaskUtils
{
    private const string ProcessPath = "config/process/process.bpmn";
    private const string UiFolderPath = "ui/";
    private const string UiFolderSettingsFile = "/Settings.json";
    private const string LayoutsFolder = "/layouts/";
    private const string PdfTaskType = "pdf";
    private const string SubformPdfTaskType = "subformPdf";

    /// <summary>The namespaces the app runtime binds to when it reads the process.</summary>
    private static readonly XNamespace _bpmn = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    /// <inheritdoc cref="_bpmn"/>
    internal static readonly XNamespace AltinnNamespace = "http://altinn.no/process";

    /// <summary>
    /// Appends a diagnostic for every PDF service task that cannot be rendered, and for every
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

        foreach (var task in FindServiceTasks(document, PdfTaskType))
        {
            var location = FileLocationHelper.GetXmlElementLocation(processFile, content, task.Element);
            CollectPdfTaskDiagnostics(task, uiFolders, location, token, diagnostics);
        }

        foreach (var task in FindServiceTasks(document, SubformPdfTaskType))
        {
            var location = FileLocationHelper.GetXmlElementLocation(processFile, content, task.Element);
            SubformPdfServiceTaskUtils.CollectDiagnostics(task, uiFolders, location, token, diagnostics);
        }
    }

    /// <summary>
    /// The object in a JSON file, or null when the file cannot be read - so a malformed file never produces a
    /// diagnostic about its content.
    /// </summary>
    internal static JsonValue? ReadJsonObject(AdditionalText file, CancellationToken token)
    {
        var content = file.GetText(token)?.ToString();
        if (content is null)
        {
            return null;
        }

        try
        {
            var value = JsonValue.Parse(content);
            return value.Type == JsonType.Object ? value : null;
        }
        catch (NanoJsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// A string property of a UI folder's <c>Settings.json</c>, or null. The app backend reads these files ignoring
    /// property case and hands the result to the frontend, so the analysis does too.
    /// </summary>
    internal static string? GetSettingsString(JsonValue settingsObject, string propertyName)
    {
        var value = settingsObject.GetPropertyIgnoreCase(propertyName);
        return value?.Type == JsonType.String ? value.GetString() : null;
    }

    private static void CollectPdfTaskDiagnostics(
        ServiceTaskElement task,
        IReadOnlyDictionary<string, UiFolder> uiFolders,
        Location location,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        // The runtime binds autoPdfTaskIds under the task extension that declares the task type. Blank entries
        // render nothing, so they do not count as listing a task.
        var autoPdfTaskIds =
            task.Extension.Element(AltinnNamespace + "pdfConfig")
                ?.Element(AltinnNamespace + "autoPdfTaskIds")
                ?.Elements(AltinnNamespace + "taskId")
                .Select(e => e.Value)
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .ToList()
            ?? [];

        uiFolders.TryGetValue(task.Id, out var ownFolder);

        if (autoPdfTaskIds.Count == 0)
        {
            if (ownFolder is null)
            {
                diagnostics.Add(
                    Diagnostic.Create(Diagnostics.Process.PdfServiceTaskHasNothingToRender, location, task.Id)
                );
            }

            return;
        }

        if (ownFolder is not null)
        {
            // With a pdfLayoutName the frontend renders that layout and ignores the listed tasks, so there is
            // nothing more to check. Without one it rejects the task parameters outright.
            if (HasPdfLayoutName(ownFolder, token) is false)
            {
                diagnostics.Add(
                    Diagnostic.Create(Diagnostics.Process.PdfServiceTaskConflictingContent, location, task.Id)
                );
            }

            return;
        }

        foreach (var taskId in autoPdfTaskIds)
        {
            if (!uiFolders.ContainsKey(taskId))
            {
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Process.PdfServiceTaskIncludesTaskWithoutUi,
                        location,
                        task.Id,
                        taskId
                    )
                );
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
    /// The app's UI folders by name. Like the app backend, only direct subfolders of <c>ui/</c> with a
    /// <c>Settings.json</c> count (<c>ui/Settings.json</c> itself holds the global settings), and a folder's layout
    /// pages are the <c>.json</c> files directly in its <c>layouts</c> folder.
    /// </summary>
    private static Dictionary<string, UiFolder> FindUiFolders(
        ImmutableArray<AdditionalText> additionalFiles,
        string appRoot
    )
    {
        var uiRoot = appRoot + UiFolderPath;
        var settingsFiles = new Dictionary<string, AdditionalText>(StringComparer.Ordinal);
        var layoutFiles = new Dictionary<string, List<AdditionalText>>(StringComparer.Ordinal);
        foreach (var file in additionalFiles)
        {
            var path = NormalizedPath(file);
            if (!path.StartsWith(uiRoot, StringComparison.Ordinal))
            {
                continue;
            }

            var relative = path.Substring(uiRoot.Length);
            var separator = relative.IndexOf('/');
            if (separator <= 0)
            {
                continue;
            }

            var folder = relative.Substring(0, separator);
            var inFolder = relative.Substring(separator);
            if (inFolder == UiFolderSettingsFile)
            {
                settingsFiles[folder] = file;
            }
            else if (
                inFolder.StartsWith(LayoutsFolder, StringComparison.Ordinal)
                && inFolder.IndexOf('/', LayoutsFolder.Length) < 0
                && inFolder.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
            )
            {
                if (!layoutFiles.TryGetValue(folder, out var pages))
                {
                    pages = [];
                    layoutFiles[folder] = pages;
                }

                pages.Add(file);
            }
        }

        var folders = new Dictionary<string, UiFolder>(StringComparer.Ordinal);
        foreach (var settings in settingsFiles)
        {
            folders[settings.Key] = new UiFolder(
                settings.Value,
                layoutFiles.TryGetValue(settings.Key, out var pages) ? pages : []
            );
        }

        return folders;
    }

    private static IEnumerable<ServiceTaskElement> FindServiceTasks(XDocument document, string taskTypeName)
    {
        foreach (var taskType in document.Descendants(AltinnNamespace + "taskType"))
        {
            if (!string.Equals(taskType.Value.Trim(), taskTypeName, StringComparison.Ordinal))
            {
                continue;
            }

            var serviceTask = taskType.Ancestors().FirstOrDefault(a => a.Name == _bpmn + "serviceTask");
            if (serviceTask?.Attribute("id")?.Value is not { Length: > 0 } id || taskType.Parent is not { } extension)
            {
                continue;
            }

            yield return new ServiceTaskElement(id, serviceTask, extension);
        }
    }

    /// <summary>
    /// Whether the UI folder's settings set <c>pages.pdfLayoutName</c>, or null when they cannot be read.
    /// </summary>
    private static bool? HasPdfLayoutName(UiFolder folder, CancellationToken token)
    {
        try
        {
            var settings = ReadJsonObject(folder.Settings, token);
            var pages = settings?.GetPropertyIgnoreCase("pages");
            if (settings is null || pages is not null && pages.Type != JsonType.Object)
            {
                return null;
            }

            return pages is not null && !string.IsNullOrWhiteSpace(GetSettingsString(pages, "pdfLayoutName"));
        }
        catch (NanoJsonException)
        {
            return null;
        }
    }

    private static string NormalizedPath(AdditionalText file) => file.Path.Replace('\\', '/');
}

/// <summary>A service task in the process.</summary>
/// <param name="Id">The service task's BPMN element id, which is also the name of its UI folder.</param>
/// <param name="Element">The <c>bpmn:serviceTask</c> element, which anchors the diagnostics.</param>
/// <param name="Extension">The <c>altinn:taskExtension</c> that declares the task type and holds its configuration.</param>
internal sealed record ServiceTaskElement(string Id, XElement Element, XElement Extension);

/// <summary>A UI folder of the app.</summary>
/// <param name="Settings">The folder's <c>Settings.json</c>.</param>
/// <param name="Layouts">The folder's layout pages.</param>
internal sealed record UiFolder(AdditionalText Settings, List<AdditionalText> Layouts);
