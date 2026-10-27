using System.Security;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Rewrites each <c>subformPdf</c> service task to the v9 configuration. In v8 the task names a Subform
/// component (<c>subformComponentId</c>) and a data type (<c>subformDataTypeId</c>), and its own UI folder holds
/// a copy of that component, whose <c>layoutSet</c> names the subform's UI folder. In v9 the task names that
/// folder directly in <c>subformUiFolder</c>, takes the data type from the folder's <c>defaultDataType</c>, and
/// needs no UI folder of its own.
///
/// Runs after the layout-set conversion, so the task's UI folder is <c>ui/&lt;taskId&gt;</c> and a subform's
/// folder is named after its layout set. The task's folder is removed when it holds nothing but the waiting
/// page Altinn Studio generates and the copy. Otherwise it is kept, with a to-do when its <c>pages.order</c>
/// lists pages, which v9 shows while the task runs.
/// </summary>
internal static class SubformPdfConfigMigration
{
    private const string ProcessPath = "config/process/process.bpmn";
    private const string ComponentIdName = "subformComponentId";
    private const string DataTypeIdName = "subformDataTypeId";
    private const string UiFolderName = "subformUiFolder";
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    /// <summary>Matches after each line ending: LF, CRLF or CR.</summary>
    private static readonly Regex _lineEnd = new(@"(?<=\r\n|\r(?!\n)|\n)", RegexOptions.CultureInvariant);

    private static readonly JsonDocumentOptions _layoutOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    /// <summary>
    /// The waiting page components Altinn Studio generates for a service task: the v9 page, and the v8 page
    /// with its retry and back buttons. A v9 subform PDF task shows the frontend's own waiting view instead.
    /// </summary>
    private static readonly JsonObject[] _generatedWaitingComponents =
    [
        WaitingText("service-task-waiting-title", "Heading", "service_task.waiting_title", size: "L"),
        WaitingText("service-task-waiting-body", "Paragraph", "service_task.waiting_body"),
        WaitingText("service-task-title", "Heading", "service_task_custom_pdf_default.title", size: "L"),
        WaitingText("service-task-body", "Paragraph", "service_task_custom_pdf_default.body"),
        WaitingText("service-task-help-text", "Paragraph", "service_task_custom_pdf_default.help_text"),
        new()
        {
            ["id"] = "service-task-button-group",
            ["type"] = "ButtonGroup",
            ["children"] = new JsonArray("service-task-retry-button", "service-task-back-button"),
        },
        WaitingText("service-task-retry-button", "Button", "service_task_custom_pdf_default.retry_button"),
        new()
        {
            ["id"] = "service-task-back-button",
            ["type"] = "ActionButton",
            ["textResourceBindings"] = new JsonObject { ["title"] = "service_task_custom_pdf_default.back_button" },
            ["action"] = "reject",
            ["buttonStyle"] = "secondary",
        },
    ];

    /// <summary>A task to rewrite, with the subform's UI folder its component copy names.</summary>
    private sealed record Plan(
        string TaskId,
        XElement ComponentIdElement,
        XElement? DataTypeIdElement,
        string UiFolder,
        string TaskFolder
    );

    /// <summary>
    /// Runs the migration. Warnings describe what was rewritten or kept; a to-do names a task that was left
    /// unchanged, or a kept folder whose pages show while the task runs, and what to do about it. No messages
    /// means there was no subform PDF task to migrate.
    /// </summary>
    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var messages = new List<UpgradeMessage>();

        var processFile = AppFiles.Resolve(projectFolder, ProcessPath);
        if (processFile is null)
            return new MigrationResult(messages);

        string text;
        bool hadBom;
        XDocument doc;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(processFile));
            doc = XDocument.Parse(text, LoadOptions.SetLineInfo);
        }
        catch (Exception ex) when (ex is DecoderFallbackException or XmlException)
        {
            messages.Todo(
                $"Could not read {ProcessPath} ({ex.Message}); skipped the subform PDF task migration. Fix the file "
                    + "and run the upgrade again."
            );
            return new MigrationResult(messages);
        }

        var tasks = SubformPdfTasks(doc).ToList();
        if (tasks.Count == 0)
            return new MigrationResult(messages);

        var uiPath = Path.Combine(projectFolder, "App", "ui");
        if (!Directory.Exists(uiPath))
            uiPath = Path.Combine(projectFolder, "ui");
        if (File.Exists(Path.Combine(uiPath, "layout-sets.json")))
        {
            messages.Todo(
                $"Left the subform PDF task(s) [{string.Join(", ", tasks.Select(t => t.TaskId))}] unchanged, because "
                    + "layout-sets.json is still there. Resolve what kept it, then run the upgrade again."
            );
            return new MigrationResult(messages);
        }

        var plans = new List<Plan>();
        foreach (var (taskId, config) in tasks)
        {
            if (PlanTask(uiPath, taskId, config, messages) is { } plan)
                plans.Add(plan);
        }

        if (plans.Count == 0)
            return new MigrationResult(messages);

        // Each line keeps its own line ending, which the XML parser's line numbers count whether it is LF, CRLF
        // or CR.
        string?[] lines = _lineEnd.Split(text);
        var applied = new List<Plan>();
        foreach (var plan in plans)
        {
            if (TryRewriteLines(lines, plan, messages))
                applied.Add(plan);
        }

        if (applied.Count == 0)
            return new MigrationResult(messages);

        var rewritten = string.Concat(lines);
        try
        {
            XDocument.Parse(rewritten);
        }
        catch (XmlException ex)
        {
            messages.Todo(
                $"Rewriting the subform PDF tasks would make {ProcessPath} invalid ({ex.Message}); left it unchanged. "
                    + $"Replace {ComponentIdName} and {DataTypeIdName} in each subformPdfConfig with {UiFolderName}, "
                    + "the UI folder of the subform."
            );
            return new MigrationResult(messages);
        }

        // The process is written before any folder is removed, so a failure leaves the v8 setup working.
        await Utf8TextFile.Write(processFile, rewritten, hadBom);

        foreach (var plan in applied)
        {
            messages.Warn(
                $"Subform PDF task '{plan.TaskId}' now names the subform's UI folder '{plan.UiFolder}' in "
                    + $"{UiFolderName}, instead of the Subform component '{plan.ComponentIdElement.Value.Trim()}' in "
                    + $"{ComponentIdName} and the data type in {DataTypeIdName}. The data type is the folder's "
                    + "defaultDataType."
            );
            RemoveTaskFolder(uiPath, plan, messages);
        }

        messages.Warn(
            $"The PDFs that subform PDF task(s) [{string.Join(", ", applied.Select(p => p.TaskId))}] create carry the "
                + $"metadata key {UiFolderName}, with the subform's UI folder, instead of {ComponentIdName}. Update "
                + $"any system that receives these PDFs and reads {ComponentIdName}."
        );

        return new MigrationResult(messages);
    }

    private static IEnumerable<(string TaskId, XElement Config)> SubformPdfTasks(XDocument doc)
    {
        foreach (var process in doc.Root?.Elements().Where(e => e.Name.LocalName == "process") ?? [])
        {
            foreach (var task in process.Elements())
            {
                var extension = task.Elements()
                    .FirstOrDefault(e => e.Name.LocalName == "extensionElements")
                    ?.Element(_altinnNs + "taskExtension");
                if (
                    extension?.Element(_altinnNs + "taskType")?.Value.Trim() != "subformPdf"
                    || task.Attribute("id")?.Value is not { } taskId
                    || extension.Element(_altinnNs + "subformPdfConfig") is not { } config
                )
                {
                    continue;
                }

                // A task with neither old setting is already on the v9 configuration.
                if (
                    config.Element(_altinnNs + ComponentIdName) is null
                    && config.Element(_altinnNs + DataTypeIdName) is null
                )
                    continue;

                yield return (taskId, config);
            }
        }
    }

    /// <summary>
    /// Finds the subform's UI folder through the component copy in the task's own folder, or reports why it
    /// cannot (as a to-do) and returns null.
    /// </summary>
    private static Plan? PlanTask(string uiPath, string taskId, XElement config, List<UpgradeMessage> messages)
    {
        var componentIds = config.Elements(_altinnNs + ComponentIdName).ToList();
        var dataTypeIds = config.Elements(_altinnNs + DataTypeIdName).ToList();
        var componentId = componentIds.Count == 1 ? componentIds[0].Value.Trim() : null;
        var manualFix =
            $"In its subformPdfConfig, replace {ComponentIdName} and {DataTypeIdName} with "
            + $"<altinn:{UiFolderName}>, naming the UI folder of the subform, and remove ui/{taskId} unless its "
            + "pages are wanted while the task runs.";

        if (
            componentIds.Count != 1
            || dataTypeIds.Count > 1
            || config.Element(_altinnNs + UiFolderName) is not null
            || string.IsNullOrEmpty(componentId)
        )
        {
            messages.Todo(
                $"Left subform PDF task '{taskId}' unchanged, because its subformPdfConfig does not have exactly one "
                    + $"{ComponentIdName}, at most one {DataTypeIdName} and no {UiFolderName}. {manualFix}"
            );
            return null;
        }

        var taskFolder = Path.Combine(uiPath, taskId);
        var copies = Directory.Exists(Path.Combine(taskFolder, "layouts"))
            ? Directory
                .EnumerateFiles(Path.Combine(taskFolder, "layouts"), "*.json")
                .SelectMany(file => Components(file) ?? [])
                .Where(component => IsSubform(component, componentId))
                .ToList()
            : [];

        if (copies.Count != 1)
        {
            messages.Todo(
                $"Left subform PDF task '{taskId}' unchanged, because ui/{taskId}/layouts has "
                    + (
                        copies.Count == 0
                            ? "no"
                            : copies.Count.ToString(System.Globalization.CultureInfo.InvariantCulture)
                    )
                    + $" Subform component with id '{componentId}', so the subform's UI folder is unknown. {manualFix}"
            );
            return null;
        }

        var uiFolder = StringValue(copies[0]["layoutSet"]);
        if (string.IsNullOrWhiteSpace(uiFolder) || !Directory.Exists(Path.Combine(uiPath, uiFolder)))
        {
            messages.Todo(
                $"Left subform PDF task '{taskId}' unchanged, because the Subform component '{componentId}' in "
                    + $"ui/{taskId} has layoutSet '{uiFolder}', which is not a UI folder. {manualFix}"
            );
            return null;
        }

        var dataTypeId = dataTypeIds.Count == 1 ? dataTypeIds[0].Value.Trim() : null;
        var defaultDataType = DefaultDataType(Path.Combine(uiPath, uiFolder, "Settings.json"));
        if (defaultDataType is null || (dataTypeId is not null && defaultDataType != dataTypeId))
        {
            messages.Todo(
                $"Subform PDF task '{taskId}' had {DataTypeIdName} '{dataTypeId}', but ui/{uiFolder}/Settings.json has "
                    + (defaultDataType is null ? "no defaultDataType" : $"defaultDataType '{defaultDataType}'")
                    + ". In v9 the task creates a PDF for each data element of the folder's defaultDataType, so set it "
                    + "to the subform's data type."
            );
        }

        return new Plan(taskId, componentIds[0], dataTypeIds.FirstOrDefault(), uiFolder, taskFolder);
    }

    /// <summary>
    /// Replaces the <c>subformComponentId</c> line with a <c>subformUiFolder</c> line and removes the
    /// <c>subformDataTypeId</c> line, leaving the rest of the file as it was. Each element must sit alone on its
    /// line; otherwise the task is left unchanged with a to-do. Removed lines, with their line endings, are set
    /// to null.
    /// </summary>
    private static bool TryRewriteLines(string?[] lines, Plan plan, List<UpgradeMessage> messages)
    {
        var componentLine = LineIndex(plan.ComponentIdElement);
        var dataTypeLine = plan.DataTypeIdElement is { } dataType ? LineIndex(dataType) : (int?)null;

        var componentMatch = WholeLineElement(lines[componentLine], ComponentIdName);
        var dataTypeMatches =
            dataTypeLine is not { } index || WholeLineElement(lines[index], DataTypeIdName) is not null;
        if (componentMatch is null || !dataTypeMatches || componentLine == dataTypeLine)
        {
            messages.Todo(
                $"Left subform PDF task '{plan.TaskId}' unchanged, because its {ComponentIdName} or {DataTypeIdName} "
                    + $"does not sit alone on a line of {ProcessPath}. Replace both with "
                    + $"<altinn:{UiFolderName}>{SecurityElement.Escape(plan.UiFolder)}</altinn:{UiFolderName}>, and "
                    + $"remove ui/{plan.TaskId} unless its pages are wanted while the task runs."
            );
            return false;
        }

        var line = lines[componentLine] ?? "";
        var lineEnd = line[line.TrimEnd('\r', '\n').Length..];
        var indent = componentMatch.Groups["indent"].Value;
        var prefix = componentMatch.Groups["prefix"].Value;
        lines[componentLine] =
            $"{indent}<{prefix}{UiFolderName}>{SecurityElement.Escape(plan.UiFolder)}</{prefix}{UiFolderName}>{lineEnd}";
        if (dataTypeLine is { } removed)
            lines[removed] = null;
        return true;
    }

    private static int LineIndex(XElement element) => ((IXmlLineInfo)element).LineNumber - 1;

    private static Match? WholeLineElement(string? line, string localName)
    {
        if (line is null)
            return null;
        var match = Regex.Match(
            line.TrimEnd('\r', '\n'),
            $@"^(?<indent>\s*)<(?<prefix>[\w.-]+:){localName}>[^<]*</\k<prefix>{localName}>\s*$",
            RegexOptions.CultureInvariant
        );
        return match.Success ? match : null;
    }

    /// <summary>
    /// Removes the task's UI folder when it holds only its settings, the waiting page Altinn Studio generates
    /// and the Subform component copy. Otherwise keeps it and says what else it holds, as a to-do when it lists
    /// pages.
    /// </summary>
    private static void RemoveTaskFolder(string uiPath, Plan plan, List<UpgradeMessage> messages)
    {
        if (!Directory.Exists(plan.TaskFolder))
            return;

        var componentId = plan.ComponentIdElement.Value.Trim();
        var otherContent = new List<string>();
        foreach (var file in Directory.EnumerateFiles(plan.TaskFolder, "*", SearchOption.AllDirectories).Order())
        {
            var relative = Path.GetRelativePath(plan.TaskFolder, file).Replace('\\', '/');
            if (relative == "Settings.json")
                continue;

            if (Path.GetDirectoryName(relative) == "layouts" && relative.EndsWith(".json", StringComparison.Ordinal))
            {
                if (Components(file) is not { } components)
                {
                    otherContent.Add(relative);
                    continue;
                }

                var custom = components
                    .Where(c =>
                        !IsSubform(c, componentId) && !_generatedWaitingComponents.Any(g => JsonNode.DeepEquals(c, g))
                    )
                    .Select(c => StringValue(c["id"]) ?? "(no id)")
                    .ToList();
                if (custom.Count > 0)
                    otherContent.Add($"{relative} ({string.Join(", ", custom)})");
                continue;
            }

            otherContent.Add(relative);
        }

        var displayFolder = $"ui/{Path.GetRelativePath(uiPath, plan.TaskFolder).Replace('\\', '/')}";
        if (otherContent.Count > 0)
        {
            var kept =
                $"Kept {displayFolder}, because it holds more than the waiting page Altinn Studio generates and the "
                + $"Subform component '{componentId}': {string.Join("; ", otherContent)}.";
            var cleanUp =
                $"Remove the folder unless those pages are wanted, and remove the Subform component '{componentId}', "
                + "which v9 does not use.";

            // In v9 the pages in pages.order show while the task runs, so a kept folder changes what users see.
            var pages = ListedPages(Path.Combine(plan.TaskFolder, "Settings.json"));
            if (pages.Count > 0)
            {
                messages.Todo(
                    $"{kept} In v9 a subform PDF task shows the pages in its folder's pages.order "
                        + $"[{string.Join(", ", pages)}] while it runs. {cleanUp}"
                );
                return;
            }

            messages.Warn(
                $"{kept} A v9 subform PDF task needs no UI folder: the app shows its own waiting view while the task "
                    + $"runs, or the folder's pages if it has one. {cleanUp}"
            );
            return;
        }

        Directory.Delete(plan.TaskFolder, recursive: true);
        messages.Warn(
            $"Removed {displayFolder}, which held only the waiting page Altinn Studio generates and the Subform "
                + $"component '{componentId}'. A v9 subform PDF task needs no UI folder, and the app shows its own "
                + "waiting view while the task runs."
        );
    }

    /// <summary>The components of a layout file, or null when it is not a readable layout.</summary>
    private static List<JsonObject>? Components(string layoutFile)
    {
        try
        {
            var (text, _) = Utf8TextFile.Decode(File.ReadAllBytes(layoutFile));
            return JsonNode.Parse(text, documentOptions: _layoutOptions)?["data"]?["layout"] is JsonArray layout
                ? [.. layout.OfType<JsonObject>()]
                : null;
        }
        catch (Exception ex) when (ex is JsonException or DecoderFallbackException or InvalidOperationException)
        {
            return null;
        }
    }

    /// <summary>
    /// The pages a folder's settings list in <c>pages.order</c>, or in the orders of <c>pages.groups</c>.
    /// Settings that cannot be read list none.
    /// </summary>
    private static List<string> ListedPages(string settingsFile)
    {
        if (!File.Exists(settingsFile))
            return [];
        try
        {
            var (text, _) = Utf8TextFile.Decode(File.ReadAllBytes(settingsFile));
            var pages = JsonNode.Parse(text, documentOptions: _layoutOptions)?["pages"] as JsonObject;
            var orders = new List<JsonNode?> { pages?["order"] };
            if (pages?["groups"] is JsonArray groups)
                orders.AddRange(groups.Select(group => (group as JsonObject)?["order"]));
            return [.. orders.OfType<JsonArray>().SelectMany(order => order).Select(StringValue).OfType<string>()];
        }
        catch (Exception ex) when (ex is JsonException or DecoderFallbackException or InvalidOperationException)
        {
            return [];
        }
    }

    private static string? DefaultDataType(string settingsFile)
    {
        if (!File.Exists(settingsFile))
            return null;
        try
        {
            var (text, _) = Utf8TextFile.Decode(File.ReadAllBytes(settingsFile));
            return StringValue(JsonNode.Parse(text, documentOptions: _layoutOptions)?["defaultDataType"]);
        }
        catch (Exception ex) when (ex is JsonException or DecoderFallbackException or InvalidOperationException)
        {
            return null;
        }
    }

    private static bool IsSubform(JsonObject component, string componentId) =>
        string.Equals(StringValue(component["type"]), "Subform", StringComparison.OrdinalIgnoreCase)
        && StringValue(component["id"]) == componentId;

    private static string? StringValue(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;

    private static JsonObject WaitingText(string id, string type, string textKey, string? size = null)
    {
        var component = new JsonObject();
        if (size is not null)
            component["size"] = size;
        component["id"] = id;
        component["type"] = type;
        component["textResourceBindings"] = new JsonObject { ["title"] = textKey };
        return component;
    }
}
