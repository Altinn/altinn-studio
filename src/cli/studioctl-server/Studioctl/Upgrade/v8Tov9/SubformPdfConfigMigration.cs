using System.Security;
using System.Text;
using System.Text.Encodings.Web;
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
/// folder is named after its layout set. The copy is removed from the task's folder. The service task page step,
/// which runs later, deals with what the folder still holds, as it does for every service task.
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

    private static readonly JsonSerializerOptions _serializerOptions = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>
    /// A task to rewrite, with the subform's UI folder its component copy names, and the data type to give that
    /// folder when its settings have none.
    /// </summary>
    private sealed record Plan(
        string TaskId,
        XElement ComponentIdElement,
        XElement? DataTypeIdElement,
        string UiFolder,
        string TaskFolder,
        string? DataTypeToAdd
    );

    /// <summary>
    /// Runs the migration. Warnings describe what was rewritten; a to-do names a task that was left unchanged, or a
    /// subform folder whose data type needs checking, and what to do about it. No messages means there was no
    /// subform PDF task to migrate.
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

        // The process is written before any copy is removed, so a failure leaves the v8 setup working.
        await Utf8TextFile.Write(processFile, rewritten, hadBom);

        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        foreach (var plan in applied)
        {
            var added = await CompleteSubformSettings(uiPath, plan, messages);
            var copiesRemoved = workspace is null ? 0 : RemoveCopy(workspace, plan);
            messages.Warn(
                $"Subform PDF task '{plan.TaskId}' now names the subform's UI folder '{plan.UiFolder}' in "
                    + $"{UiFolderName}, instead of the Subform component '{plan.ComponentIdElement.Value.Trim()}' in "
                    + $"{ComponentIdName} and the data type in {DataTypeIdName}. The data type is the folder's "
                    + "defaultDataType."
                    + (
                        added.Count == 0
                            ? ""
                            : $" Added {string.Join(" and ", added)} to ui/{plan.UiFolder}/Settings.json."
                    )
                    + (
                        copiesRemoved > 0
                            ? $" Removed the Subform component from ui/{plan.TaskId}, which v9 does not use."
                            : ""
                    )
            );
        }

        if (workspace is not null)
            await workspace.Save();

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
            + $"<altinn:{UiFolderName}>, naming the UI folder of the subform, and remove the Subform component "
            + $"from ui/{taskId}, which v9 does not use.";

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
        if (
            string.IsNullOrWhiteSpace(uiFolder)
            || uiFolder.IndexOfAny(['/', '\\']) >= 0
            || uiFolder is "." or ".."
            || !Directory.Exists(Path.Combine(uiPath, uiFolder))
        )
        {
            messages.Todo(
                $"Left subform PDF task '{taskId}' unchanged, because the Subform component '{componentId}' in "
                    + $"ui/{taskId} has layoutSet '{uiFolder}', which is not a UI folder. {manualFix}"
            );
            return null;
        }

        var dataTypeId = dataTypeIds.Count == 1 ? dataTypeIds[0].Value.Trim() : null;
        var settings = ReadSettings(Path.Combine(uiPath, uiFolder, "Settings.json"));
        var defaultDataType = StringValue(settings?["defaultDataType"]);
        // Settings without a defaultDataType get the task's, as the subform's data type.
        var dataTypeToAdd =
            settings is not null && !settings.ContainsKey("defaultDataType") && !string.IsNullOrEmpty(dataTypeId)
                ? dataTypeId
                : null;
        if (
            dataTypeToAdd is null
            && (defaultDataType is null || (dataTypeId is not null && defaultDataType != dataTypeId))
        )
            messages.Todo(DataTypeTodo(taskId, dataTypeId, uiFolder, defaultDataType));

        return new Plan(taskId, componentIds[0], dataTypeIds.FirstOrDefault(), uiFolder, taskFolder, dataTypeToAdd);
    }

    private static string DataTypeTodo(string taskId, string? dataTypeId, string uiFolder, string? defaultDataType) =>
        $"Subform PDF task '{taskId}' had "
        + (string.IsNullOrEmpty(dataTypeId) ? $"no {DataTypeIdName}, and" : $"{DataTypeIdName} '{dataTypeId}', but")
        + $" ui/{uiFolder}/Settings.json has "
        + (defaultDataType is null ? "no defaultDataType" : $"defaultDataType '{defaultDataType}'")
        + ". In v9 the task creates a PDF for each data element of the folder's defaultDataType, so set it to the "
        + "subform's data type.";

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
    /// Removes the Subform component copy from the layouts in the task's UI folder, and returns how many it
    /// removed. A page left empty stays for the service task page step, which removes it.
    /// </summary>
    private static int RemoveCopy(LayoutMigrationWorkspace workspace, Plan plan)
    {
        var componentId = plan.ComponentIdElement.Value.Trim();
        var layouts = workspace.DocumentsIn(Path.Combine(plan.TaskFolder, "layouts")).ToHashSet();
        return workspace
            .ApplyDocuments(document =>
            {
                if (!layouts.Contains(document) || document.Root["data"]?["layout"] is not JsonArray components)
                    return 0;
                var copies = components.OfType<JsonObject>().Where(c => IsSubform(c, componentId)).ToList();
                foreach (var copy in copies)
                    components.Remove(copy);
                return copies.Count;
            })
            .Changes;
    }

    /// <summary>
    /// Adds <c>"type": "subform"</c>, which Altinn Studio finds subform folders by, to the subform folder's
    /// settings when they have no type, and the plan's data type as <c>defaultDataType</c> when they have none.
    /// Keeps the file's comments, byte order mark, line endings and final line ending. Returns what it added;
    /// settings that are missing or cannot be read are left alone.
    /// </summary>
    private static async Task<List<string>> CompleteSubformSettings(
        string uiPath,
        Plan plan,
        List<UpgradeMessage> messages
    )
    {
        var settingsFile = Path.Combine(uiPath, plan.UiFolder, "Settings.json");
        if (!File.Exists(settingsFile))
            return [];

        string text;
        bool hadBom;
        JsonObject settings;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(settingsFile));
            if (JsonNode.Parse(text, documentOptions: _layoutOptions) is not JsonObject parsed)
                return [];
            settings = parsed;
        }
        catch (Exception ex) when (ex is JsonException or DecoderFallbackException)
        {
            return [];
        }

        var added = new List<string>();
        if (!settings.ContainsKey("type"))
        {
            settings["type"] = "subform";
            added.Add("\"type\": \"subform\"");
        }

        if (plan.DataTypeToAdd is { } dataType)
        {
            // Another task naming the same folder may have added its own data type first.
            if (!settings.ContainsKey("defaultDataType"))
            {
                settings["defaultDataType"] = dataType;
                added.Add($"\"defaultDataType\": \"{dataType}\"");
            }
            else if (StringValue(settings["defaultDataType"]) is var existing && existing != dataType)
            {
                messages.Todo(DataTypeTodo(plan.TaskId, dataType, plan.UiFolder, existing));
            }
        }

        if (added.Count == 0)
            return added;

        var lineEnding = text.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";
        var updated = LayoutJsonComments
            .Restore(text, settings.ToJsonString(_serializerOptions))
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace("\n", lineEnding, StringComparison.Ordinal);
        if (text.EndsWith('\n'))
            updated += lineEnding;
        await Utf8TextFile.Write(settingsFile, updated, hadBom);
        return added;
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

    /// <summary>A folder's settings, or null when they are missing or cannot be read.</summary>
    private static JsonObject? ReadSettings(string settingsFile)
    {
        if (!File.Exists(settingsFile))
            return null;
        try
        {
            var (text, _) = Utf8TextFile.Decode(File.ReadAllBytes(settingsFile));
            return JsonNode.Parse(text, documentOptions: _layoutOptions) as JsonObject;
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
}
