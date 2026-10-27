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
/// its layout file is deleted; <c>pdfLayoutName</c> stays. Any other page a service task's folder lists is kept,
/// with a to-do, since only the developer knows whether it is meant for users waiting on the task. Subform PDF
/// tasks are left out: the step that moves them to <c>subformUiFolder</c> deals with their folders.
///
/// A task counts as a service task when it is a <c>serviceTask</c> element, as Altinn Studio writes them, or has
/// the type of one of the app library's service tasks. Runs after the layout-set conversion, so a task's folder is
/// <c>ui/&lt;taskId&gt;</c>.
/// </summary>
internal static class ServiceTaskPageMigration
{
    private const string ProcessPath = "config/process/process.bpmn";
    private const string PdfTaskType = "pdf";
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    /// <summary>The types of the app library's service tasks, which apply to any task element.</summary>
    private static readonly HashSet<string> _serviceTaskTypes = new(StringComparer.Ordinal)
    {
        PdfTaskType,
        "subformPdf",
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
    /// The pages Altinn Studio generated for a PDF task: Designer's page, with the <c>Header</c> it wrote until
    /// August 2026 and the <c>Heading</c> it writes since, and the waiting page earlier versions of this upgrade
    /// gave the PDF tasks they added.
    /// </summary>
    private static readonly JsonArray[] _generatedPages =
    [
        DesignerPage("Header"),
        DesignerPage("Heading"),
        Components(
            """
            [
              { "size": "L", "id": "service-task-waiting-title", "type": "Heading", "textResourceBindings": { "title": "service_task.waiting_title" } },
              { "id": "service-task-waiting-body", "type": "Paragraph", "textResourceBindings": { "title": "service_task.waiting_body" } }
            ]
            """
        ),
    ];

    /// <summary>
    /// Runs the migration. A warning names each page removed; a to-do names the pages a service task's folder
    /// still lists, or settings that could not be read. No messages means no service task lists a page.
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
            tasks = ServiceTasks(XDocument.Parse(text)).Where(task => task.TaskType != "subformPdf").ToList();
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

        if (taskType != PdfTaskType)
        {
            var allPages = order.Concat(groupPages ?? []).Distinct(StringComparer.Ordinal).ToList();
            if (allPages.Count > 0)
            {
                messages.Todo(
                    $"Service task '{taskId}'{(taskType is null ? "" : $" ({taskType})")} lists the page(s) "
                        + $"[{string.Join(", ", allPages)}] in {displaySettings}. {ShownWhileRunning} Keep them only if "
                        + "they are meant for users waiting on the task; otherwise empty pages.order."
                );
            }
            return;
        }

        var pdfLayoutName = StringValue(pages?["pdfLayoutName"]);
        var generated = order
            .Distinct(StringComparer.Ordinal)
            .Where(page => page != pdfLayoutName && IsGenerated(Path.Combine(folder, "layouts", $"{page}.json")))
            .ToList();
        var listed = order
            .Where(page => !generated.Contains(page, StringComparer.Ordinal))
            .Concat(groupPages ?? [])
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (generated.Count > 0)
        {
            if (WithoutPages(text, settings, generated) is { } updated)
            {
                // Settings first: should the run stop in between, a layout file no order lists is harmless.
                await Utf8TextFile.Write(settingsFile, updated, hadBom);
                foreach (var page in generated)
                {
                    File.Delete(Path.Combine(folder, "layouts", $"{page}.json"));
                    messages.Warn(
                        $"Removed the page '{page}' Altinn Studio generated in ui/{taskId}, from pages.order and "
                            + $"layouts/{page}.json. In v9 a service task shows the pages in its pages.order while it "
                            + $"runs, so PDF task '{taskId}' would have shown it on every run. The app shows its own "
                            + "waiting view instead, and the PDF is unchanged."
                    );
                }
            }
            else
            {
                listed = [.. generated, .. listed];
            }
        }

        if (listed.Count > 0)
        {
            messages.Todo(
                $"PDF task '{taskId}' lists the page(s) [{string.Join(", ", listed)}] in {displaySettings}. "
                    + $"{ShownWhileRunning} They are not part of the PDF. Remove them from pages.order (keep "
                    + "pdfLayoutName) unless they are meant for users waiting for the PDF."
            );
        }
    }

    /// <summary>
    /// Whether the layout file holds exactly a page Altinn Studio generated: its components, in order, and
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
                && _generatedPages.Any(page => JsonNode.DeepEquals(layout, page));
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

    private static JsonArray DesignerPage(string headingType) =>
        Components(
            $$"""
            [
              { "size": "L", "id": "service-task-title", "type": "{{headingType}}", "textResourceBindings": { "title": "service_task_custom_pdf_default.title" } },
              { "id": "service-task-body", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.body" } },
              { "id": "service-task-help-text", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.help_text" } },
              { "id": "service-task-button-group", "type": "ButtonGroup", "children": ["service-task-retry-button", "service-task-back-button"] },
              { "id": "service-task-retry-button", "type": "Button", "textResourceBindings": { "title": "service_task_custom_pdf_default.retry_button" } },
              { "id": "service-task-back-button", "type": "ActionButton", "textResourceBindings": { "title": "service_task_custom_pdf_default.back_button" }, "action": "reject", "buttonStyle": "secondary" }
            ]
            """
        );

    private static JsonArray Components(string json) =>
        JsonNode.Parse(json) as JsonArray ?? throw new InvalidOperationException("Not a JSON array.");

    private static string? StringValue(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;
}
