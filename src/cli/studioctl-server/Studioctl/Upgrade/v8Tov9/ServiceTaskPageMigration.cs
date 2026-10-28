using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Deals with the pages in service tasks' UI folders, which v9 shows, read-only, from the moment the process
/// reaches the task until the next task shows.
///
/// For a PDF task, Altinn Studio Designer lists a page, <c>ServiceTask</c>, in the folder's <c>pages.order</c>: a
/// "something went wrong" message with retry and back buttons, which users would see on every PDF run. A page that
/// is exactly what Altinn Studio generated, ignoring property order and formatting, leaves <c>pages.order</c> and
/// its layout file is deleted, in any service task's folder; <c>pdfLayoutName</c> stays.
///
/// In v8 the process stopped on a service task only when the task failed, so the pages a subform PDF task lists, and
/// those a PDF task with a <c>pdfLayoutName</c> lists besides it, showed only then: neither task rendered them into
/// its PDF. They leave <c>pages.order</c> too, and keep their layout files. Any other page a service task's folder
/// lists is kept, with a to-do, since only the developer knows whether it is meant for users waiting on the task, or,
/// for a PDF task without a <c>pdfLayoutName</c>, whether it was the PDF. A folder left with only its settings,
/// listing no page and naming no <c>pdfLayoutName</c>, is removed, since the app reads nothing from it.
///
/// A task counts as a service task when it is a <c>serviceTask</c> element, as Altinn Studio writes them, or has
/// the type of one of the app library's service tasks. Runs after the layout migrations and the layout-set
/// conversion, so a task's folder is <c>ui/&lt;taskId&gt;</c>, and after the subform PDF task step, which leaves
/// out the Subform component copy those tasks no longer use.
/// </summary>
internal static class ServiceTaskPageMigration
{
    private const string ProcessPath = "config/process/process.bpmn";
    private const string PdfTaskType = "pdf";
    private const string SubformPdfTaskType = "subformPdf";
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    /// <summary>The types of the app library's service tasks, which apply to any task element.</summary>
    private static readonly HashSet<string> _serviceTaskTypes = new(StringComparer.Ordinal)
    {
        PdfTaskType,
        SubformPdfTaskType,
        "eFormidling",
        "fiksArkiv",
    };

    private const string ShownWhileRunning =
        "In v9 a service task shows the pages in its pages.order, read-only, from the moment the process reaches it "
        + "until the next task shows.";

    private static readonly JsonDocumentOptions _documentOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private static readonly JsonReaderOptions _readerOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private static readonly JsonSerializerOptions _serializerOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>
    /// The page Altinn Studio Designer generates for a v8 PDF task. It wrote a <c>Header</c> until August 2026,
    /// which the layout migrations, run before this step, rename to <c>Heading</c>.
    /// </summary>
    private static readonly JsonArray _generatedPage = Components(
        """
        [
          { "size": "L", "id": "service-task-title", "type": "Heading", "textResourceBindings": { "title": "service_task_custom_pdf_default.title" } },
          { "id": "service-task-body", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.body" } },
          { "id": "service-task-help-text", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.help_text" } },
          { "id": "service-task-button-group", "type": "ButtonGroup", "children": ["service-task-retry-button", "service-task-back-button"] },
          { "id": "service-task-retry-button", "type": "Button", "textResourceBindings": { "title": "service_task_custom_pdf_default.retry_button" } },
          { "id": "service-task-back-button", "type": "ActionButton", "textResourceBindings": { "title": "service_task_custom_pdf_default.back_button" }, "action": "reject", "buttonStyle": "secondary" }
        ]
        """
    );

    /// <summary>
    /// Runs the migration. A warning names each page and folder removed; a to-do names the pages a service task's
    /// folder still lists, or settings that could not be read. No messages means no service task lists a page.
    /// </summary>
    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var messages = new List<UpgradeMessage>();

        var processFile = AppFiles.Resolve(projectFolder, ProcessPath);
        if (processFile is null)
            return new MigrationResult(messages);

        List<(string TaskId, string? TaskType)> tasks;
        try
        {
            var (text, _) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(processFile));
            tasks = ServiceTasks(XDocument.Parse(text)).ToList();
        }
        catch (Exception ex) when (ex is DecoderFallbackException or XmlException)
        {
            messages.Todo(
                $"Could not read {ProcessPath} ({ex.Message}); skipped the pages of service tasks. Fix the file and "
                    + "run the upgrade again."
            );
            return new MigrationResult(messages);
        }

        if (tasks.Count == 0)
            return new MigrationResult(messages);

        var uiPath = Path.Combine(projectFolder, "App", "ui");
        if (!Directory.Exists(uiPath))
            uiPath = Path.Combine(projectFolder, "ui");
        if (File.Exists(Path.Combine(uiPath, "layout-sets.json")))
        {
            messages.Todo(
                $"Left the pages of service task(s) [{string.Join(", ", tasks.Select(task => task.TaskId))}] unchanged, "
                    + "because layout-sets.json is still there. Resolve what kept it, then run the upgrade again."
            );
            return new MigrationResult(messages);
        }

        foreach (var (taskId, taskType) in tasks)
            await MigrateTask(Path.Combine(uiPath, taskId), taskId, taskType, messages);

        return new MigrationResult(messages);
    }

    private static IEnumerable<(string TaskId, string? TaskType)> ServiceTasks(XDocument doc)
    {
        foreach (var process in doc.Root?.Elements().Where(e => e.Name.LocalName == "process") ?? [])
        {
            foreach (var task in process.Elements())
            {
                var taskType = task.Elements()
                    .FirstOrDefault(e => e.Name.LocalName == "extensionElements")
                    ?.Element(_altinnNs + "taskExtension")
                    ?.Element(_altinnNs + "taskType")
                    ?.Value.Trim();
                if (
                    (
                        task.Name.LocalName == "serviceTask"
                        || (taskType is not null && _serviceTaskTypes.Contains(taskType))
                    ) && task.Attribute("id")?.Value is { } taskId
                )
                    yield return (taskId, taskType);
            }
        }
    }

    private static async Task MigrateTask(string folder, string taskId, string? taskType, List<UpgradeMessage> messages)
    {
        var settingsFile = Path.Combine(folder, "Settings.json");
        if (!File.Exists(settingsFile))
            return;

        var displaySettings = $"ui/{taskId}/Settings.json";

        string text;
        bool hadBom;
        JsonObject settings;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(settingsFile));
            settings =
                JsonNode.Parse(text, documentOptions: _documentOptions) as JsonObject
                ?? throw new JsonException("it is not a JSON object");
        }
        catch (Exception ex) when (ex is JsonException or DecoderFallbackException)
        {
            messages.Todo(
                $"Could not read {displaySettings} of service task '{taskId}' ({ex.Message}). {ShownWhileRunning} "
                    + "Keep the pages it lists only if they are meant for users waiting on the task"
                    + (taskType == PdfTaskType ? ", and keep pdfLayoutName." : ".")
            );
            return;
        }

        var pages = settings["pages"] as JsonObject;
        var groupPages = (pages?["groups"] as JsonArray)
            ?.OfType<JsonObject>()
            .SelectMany(group => group["order"] as JsonArray ?? [])
            .Select(StringValue)
            .OfType<string>()
            .ToList();
        var order = (pages?["order"] as JsonArray)?.Select(StringValue).OfType<string>().ToList() ?? [];
        var pdfLayoutName = StringValue(pages?["pdfLayoutName"]);
        var generated = order
            .Distinct(StringComparer.Ordinal)
            .Where(page => page != pdfLayoutName && IsGenerated(Path.Combine(folder, "layouts", $"{page}.json")))
            .ToList();
        var failurePages =
            taskType == SubformPdfTaskType || (taskType == PdfTaskType && pdfLayoutName is not null)
                ? order
                    .Distinct(StringComparer.Ordinal)
                    .Where(page => page != pdfLayoutName && !generated.Contains(page, StringComparer.Ordinal))
                    .ToList()
                : [];
        var leaving = generated.Concat(failurePages).ToList();
        var listed = order
            .Where(page => !leaving.Contains(page, StringComparer.Ordinal))
            .Concat(groupPages ?? [])
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (leaving.Count > 0)
        {
            if (WithoutPages(text, settings, leaving) is { } updated)
            {
                // Settings first: should the run stop in between, a layout file no order lists is harmless.
                await Utf8TextFile.Write(settingsFile, updated, hadBom);
                foreach (var page in generated)
                {
                    File.Delete(Path.Combine(folder, "layouts", $"{page}.json"));
                    messages.Warn(
                        $"Removed the page '{page}' Altinn Studio generated in ui/{taskId}, from pages.order and "
                            + $"layouts/{page}.json. In v9 a service task shows the pages in its pages.order while it "
                            + $"runs, so {TaskName(taskId, taskType)} would have shown it every time it runs. The app "
                            + "shows its own waiting view instead"
                            + (taskType == PdfTaskType ? ", and the PDF is unchanged." : ".")
                    );
                }

                if (failurePages.Count > 0)
                    messages.Warn(
                        $"Took the page(s) [{string.Join(", ", failurePages)}] out of pages.order in ui/{taskId} and "
                            + $"kept their layout files. In v8 {TaskName(taskId, taskType)} showed them only when it "
                            + "failed, but v9 shows the pages in pages.order while the task runs, and its own view when "
                            + "it fails. List a page again only if it is meant for users waiting on the task"
                            + (taskType == PdfTaskType ? ". The PDF is unchanged." : ".")
                    );
            }
            else
            {
                listed = [.. leaving, .. listed];
            }
        }

        if (listed.Count > 0)
        {
            messages.Todo(
                taskType == PdfTaskType
                    ? $"PDF task '{taskId}' lists the page(s) [{string.Join(", ", listed)}] in {displaySettings}. "
                        + $"{ShownWhileRunning} They are not part of the PDF. Remove them from pages.order (keep "
                        + "pdfLayoutName) unless they are meant for users waiting for the PDF."
                    : $"{TaskName(taskId, taskType)} lists the page(s) [{string.Join(", ", listed)}] in "
                        + $"{displaySettings}. {ShownWhileRunning} Keep them only if they are meant for users waiting "
                        + "on the task; otherwise empty pages.order."
            );
            return;
        }

        if (pdfLayoutName is null && HoldsOnlySettings(folder))
        {
            Directory.Delete(folder, recursive: true);
            messages.Warn(
                $"Removed ui/{taskId}, which held only its settings and listed no page, so the app read nothing from "
                    + $"it. {TaskName(taskId, taskType)} shows the app's own waiting view while it runs."
            );
        }
    }

    private static string TaskName(string taskId, string? taskType)
    {
        if (taskType == PdfTaskType)
            return $"PDF task '{taskId}'";
        return taskType is null ? $"Service task '{taskId}'" : $"Service task '{taskId}' ({taskType})";
    }

    /// <summary>Whether the folder's only file is its <c>Settings.json</c>.</summary>
    private static bool HoldsOnlySettings(string folder) =>
        Directory
            .EnumerateFiles(folder, "*", SearchOption.AllDirectories)
            .All(file => Path.GetRelativePath(folder, file) == "Settings.json");

    /// <summary>
    /// Whether the layout file holds exactly the page Altinn Studio generated: its components, in order, and
    /// nothing besides them and a <c>$schema</c>.
    /// </summary>
    private static bool IsGenerated(string layoutFile)
    {
        if (!File.Exists(layoutFile))
            return false;
        try
        {
            var (text, _) = Utf8TextFile.Decode(File.ReadAllBytes(layoutFile));
            return JsonNode.Parse(text, documentOptions: _documentOptions) is JsonObject root
                && root.All(property => property.Key is "$schema" or "data")
                && root["data"] is JsonObject { Count: 1 } data
                && data["layout"] is JsonArray layout
                && JsonNode.DeepEquals(layout, _generatedPage);
        }
        catch (Exception ex) when (ex is JsonException or DecoderFallbackException)
        {
            return false;
        }
    }

    /// <summary>
    /// The settings text with <paramref name="removed"/> taken out of the <c>pages.order</c> array, which is
    /// rewritten on one line, leaving the rest of the file as it was. Null unless the result is exactly the same
    /// JSON without those pages.
    /// </summary>
    private static string? WithoutPages(string text, JsonObject settings, IReadOnlyCollection<string> removed)
    {
        var expected = settings.DeepClone();
        if (expected["pages"]?["order"] is not JsonArray order)
            return null;
        foreach (var entry in order.Where(entry => StringValue(entry) is { } page && removed.Contains(page)).ToList())
            order.Remove(entry);

        var bytes = Encoding.UTF8.GetBytes(text);
        if (OrderSpan(bytes) is not var (start, end))
            return null;

        var result =
            Encoding.UTF8.GetString(bytes.AsSpan(0, start))
            + $"[{string.Join(", ", order.Select(entry => entry?.ToJsonString(_serializerOptions) ?? "null"))}]"
            + Encoding.UTF8.GetString(bytes.AsSpan(end));
        try
        {
            return JsonNode.DeepEquals(JsonNode.Parse(result, documentOptions: _documentOptions), expected)
                ? result
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>The byte range of the <c>pages.order</c> array in the settings, or null if it has none.</summary>
    private static (int Start, int End)? OrderSpan(byte[] bytes)
    {
        var reader = new Utf8JsonReader(bytes, _readerOptions);
        if (!reader.Read() || reader.TokenType != JsonTokenType.StartObject)
            return null;

        (int, int)? span = null;
        while (FindProperty(ref reader, "pages") && reader.Read() && reader.TokenType == JsonTokenType.StartObject)
        {
            while (FindProperty(ref reader, "order") && reader.Read())
            {
                if (reader.TokenType != JsonTokenType.StartArray || span is not null)
                    return null;
                var start = (int)reader.TokenStartIndex;
                reader.Skip();
                span = (start, (int)reader.TokenStartIndex + 1);
            }
        }

        return span;
    }

    /// <summary>
    /// Reads to the next property of the current object named <paramref name="name"/>, skipping the values of
    /// the others. False at the end of the object.
    /// </summary>
    private static bool FindProperty(ref Utf8JsonReader reader, string name)
    {
        while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
        {
            if (reader.ValueTextEquals(name))
                return true;
            reader.Read();
            reader.Skip();
        }

        return false;
    }

    private static JsonArray Components(string json) =>
        JsonNode.Parse(json) as JsonArray ?? throw new InvalidOperationException("Not a JSON array.");

    private static string? StringValue(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;
}
