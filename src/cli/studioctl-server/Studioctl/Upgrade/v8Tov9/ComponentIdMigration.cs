using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Renames component IDs that the v9 layout schema rejects, and the references to them in the same UI folder.
/// A v9 component ID holds only letters, digits and <c>-</c>, and cannot end in <c>-</c> and one to five digits,
/// because the frontend reads that ending as a repeating group row index: <c>name-1</c> is row 1 of <c>name</c>.
/// </summary>
internal static class ComponentIdMigration
{
    // Matches the component id pattern in the v9 layout schema (App/frontend/src/codegen/Common.ts).
    private static readonly Regex _validId = new(
        "^[0-9a-zA-Z][0-9a-zA-Z-]*(-?[a-zA-Z]+|[a-zA-Z][0-9]+|-[0-9]{6,})$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );
    private static readonly Regex _invalidCharacters = new(
        "[^0-9a-zA-Z-]+",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );
    private static readonly Regex _repeatedDashes = new("-{2,}", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex _rowIndexLikeEnding = new(
        "-([0-9]{1,5})$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    // A group's children can name a component on another page of a v8 multi-page group as "<page>:<id>".
    private static readonly Regex _multiPageChild = new(
        "^([0-9]+:)(.+)$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    // Properties holding a list of component IDs.
    private static readonly string[] _idListProperties = ["children", "tableHeaders", "excludedChildren"];

    // Properties holding one component ID: Summary, Summary2 overrides, Grid cells and Cards media.
    private static readonly string[] _idProperties = ["componentRef", "componentId", "component", "media"];

    private static readonly JsonDocumentOptions _jsonOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private static readonly JsonSerializerOptions _serializerOptions = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        if (workspace is null)
            return new MigrationResult();

        var messages = new List<UpgradeMessage>();
        var renames = PlanRenames(projectFolder, workspace, messages);
        if (renames.Count == 0)
            return new MigrationResult(messages);

        // Every folder, since a Summary2 target with a taskId names a component in another task's folder.
        var noRenames = new Dictionary<string, string>(StringComparer.Ordinal);
        workspace.ApplyDocuments(document =>
            RewriteLayout(
                document.Root,
                renames.GetValueOrDefault(LayoutsDirectory(document.FilePath), noRenames),
                renames
            )
        );
        await workspace.Save();

        foreach (var (layoutsDirectory, folderRenames) in renames.OrderBy(pair => pair.Key, StringComparer.Ordinal))
        {
            await RewriteSettings(layoutsDirectory, folderRenames);
            var folder = DisplayPath(projectFolder, Path.GetDirectoryName(layoutsDirectory) ?? layoutsDirectory);
            messages.Ok(
                $"Renamed {folderRenames.Count} component ID(s) in {folder} that v9 does not accept: "
                    + string.Join(", ", folderRenames.Select(pair => $"{pair.Key} → {pair.Value}"))
            );
        }

        var appFolder = Path.GetDirectoryName(workspace.UiDirectory) ?? projectFolder;
        foreach (var (file, ids) in FindCodeReferences(appFolder, renames))
        {
            messages.Todo(
                $"{DisplayPath(projectFolder, file)} names the renamed component ID(s) {string.Join(", ", ids)}. "
                    + "Change them to the new IDs listed above."
            );
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// A v9 component ID for <paramref name="id"/>, or null when v9 accepts it as it is. Characters v9 does not
    /// accept become <c>-</c>, Norwegian letters are spelled out, and a dash before a row-index-like ending is
    /// dropped, so <c>Header_1</c> becomes <c>Header1</c>.
    /// </summary>
    internal static string? ValidIdFor(string id)
    {
        if (_validId.IsMatch(id))
            return null;

        var candidate = id.Replace("æ", "ae", StringComparison.Ordinal)
            .Replace("Æ", "Ae", StringComparison.Ordinal)
            .Replace("ø", "o", StringComparison.Ordinal)
            .Replace("Ø", "O", StringComparison.Ordinal)
            .Replace("å", "aa", StringComparison.Ordinal)
            .Replace("Å", "Aa", StringComparison.Ordinal);
        candidate = _invalidCharacters.Replace(candidate, "-");
        candidate = _repeatedDashes.Replace(candidate, "-").Trim('-');
        if (candidate.Length == 0)
            candidate = "component";

        while (!_validId.IsMatch(candidate) && _rowIndexLikeEnding.Match(candidate) is { Success: true } ending)
            candidate = candidate[..ending.Index] + ending.Groups[1].Value;

        // Still ends in digits with no letter before them, such as "12".
        if (!_validId.IsMatch(candidate))
            candidate += "-id";

        return candidate;
    }

    internal static bool IsValidId(string id) => _validId.IsMatch(id);

    /// <summary>The renames for each layouts directory, keyed by its full path.</summary>
    private static Dictionary<string, Dictionary<string, string>> PlanRenames(
        string projectFolder,
        LayoutMigrationWorkspace workspace,
        List<UpgradeMessage> messages
    )
    {
        var renames = new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal);
        foreach (var folder in workspace.Documents.GroupBy(document => LayoutsDirectory(document.FilePath)))
        {
            var ids = folder
                .SelectMany(document => ComponentIds(document.Root))
                .Distinct(StringComparer.Ordinal)
                .ToList();
            var invalid = ids.Where(id => !IsValidId(id)).ToList();
            if (invalid.Count == 0)
                continue;

            if (workspace.HasUnreadableFileIn(folder.Key) || workspace.HasManualConversionFileIn(folder.Key))
            {
                messages.Todo(
                    $"{DisplayPath(projectFolder, folder.Key)} has component IDs that v9 does not accept ({string.Join(", ", invalid)}), but holds "
                        + "a layout file the upgrade could not read, so they were not renamed. Fix that file and rerun "
                        + "the upgrade, or rename them by hand to letters, digits and '-', not ending in '-' and a number."
                );
                continue;
            }

            var taken = ids.Where(IsValidId).ToHashSet(StringComparer.Ordinal);
            var folderRenames = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var id in invalid)
            {
                var newId = Unique(ValidIdFor(id) ?? id, taken);
                taken.Add(newId);
                folderRenames[id] = newId;
            }

            renames[folder.Key] = folderRenames;
        }

        return renames;
    }

    private static string Unique(string id, HashSet<string> taken)
    {
        if (!taken.Contains(id))
            return id;
        for (var letter = 'b'; letter <= 'z'; letter++)
        {
            var candidate = $"{id}-{letter}";
            if (!taken.Contains(candidate))
                return candidate;
        }

        var number = 2;
        while (taken.Contains($"{id}-copy{number}"))
            number++;
        return $"{id}-copy{number}";
    }

    private static IEnumerable<string> ComponentIds(JsonNode root)
    {
        if (root["data"]?["layout"] is not JsonArray layout)
            yield break;
        foreach (var component in layout.OfType<JsonObject>())
        {
            if (StringValue(component["id"]) is { } id)
                yield return id;
        }
    }

    private static int RewriteLayout(
        JsonNode root,
        Dictionary<string, string> folderRenames,
        Dictionary<string, Dictionary<string, string>> allRenames
    )
    {
        var changes = 0;
        if (root["data"]?["layout"] is JsonArray layout)
        {
            foreach (var component in layout.OfType<JsonObject>())
            {
                if (StringValue(component["id"]) is { } id && folderRenames.TryGetValue(id, out var newId))
                {
                    component["id"] = newId;
                    changes++;
                }
            }
        }

        return changes + RewriteReferences(root, folderRenames, allRenames);
    }

    private static int RewriteReferences(
        JsonNode? node,
        Dictionary<string, string> folderRenames,
        Dictionary<string, Dictionary<string, string>> allRenames
    )
    {
        var changes = 0;
        switch (node)
        {
            case JsonObject obj:
                foreach (var property in _idListProperties)
                {
                    if (obj[property] is JsonArray list)
                        changes += RewriteIdList(list, folderRenames);
                }

                foreach (var property in _idProperties)
                {
                    if (StringValue(obj[property]) is { } id && folderRenames.TryGetValue(id, out var newId))
                    {
                        obj[property] = newId;
                        changes++;
                    }
                }

                // A RepeatingGroup's tableColumns settings are keyed by child component ID.
                if (obj["tableColumns"] is JsonObject tableColumns)
                    changes += RenameKeys(tableColumns, folderRenames);

                if (obj["target"] is JsonObject target)
                    changes += RewriteSummaryTarget(target, folderRenames, allRenames);

                foreach (var (name, child) in obj.ToList())
                {
                    if (_idListProperties.Contains(name, StringComparer.Ordinal))
                        continue;
                    changes += RewriteReferences(child, folderRenames, allRenames);
                }

                break;
            case JsonArray array:
                changes += RewriteExpression(array, folderRenames);
                foreach (var child in array.ToList())
                    changes += RewriteReferences(child, folderRenames, allRenames);
                break;
        }

        return changes;
    }

    private static int RewriteIdList(JsonArray list, Dictionary<string, string> folderRenames)
    {
        var changes = 0;
        for (var i = 0; i < list.Count; i++)
        {
            if (StringValue(list[i]) is not { } entry)
                continue;
            var (prefix, id) = _multiPageChild.Match(entry) is { Success: true } match
                ? (match.Groups[1].Value, match.Groups[2].Value)
                : ("", entry);
            if (folderRenames.TryGetValue(id, out var newId))
            {
                list[i] = prefix + newId;
                changes++;
            }
        }

        return changes;
    }

    private static int RenameKeys(JsonObject obj, Dictionary<string, string> folderRenames)
    {
        var properties = obj.ToList();
        if (!properties.Any(property => folderRenames.ContainsKey(property.Key)))
            return 0;

        var changes = 0;
        obj.Clear();
        foreach (var (key, value) in properties)
        {
            if (folderRenames.TryGetValue(key, out var newKey) && !properties.Any(p => p.Key == newKey))
            {
                obj[newKey] = value;
                changes++;
            }
            else
            {
                obj[key] = value;
            }
        }

        return changes;
    }

    /// <summary>
    /// A Summary2 target names a component unless its type says otherwise. With a taskId it names a component in
    /// that task's UI folder.
    /// </summary>
    private static int RewriteSummaryTarget(
        JsonObject target,
        Dictionary<string, string> folderRenames,
        Dictionary<string, Dictionary<string, string>> allRenames
    )
    {
        if (StringValue(target["type"]) is { } type && type != "component")
            return 0;
        if (StringValue(target["id"]) is not { } id)
            return 0;

        var renames = folderRenames;
        if (StringValue(target["taskId"]) is { } taskId)
        {
            var taskFolder = allRenames.FirstOrDefault(pair =>
                string.Equals(Path.GetFileName(Path.GetDirectoryName(pair.Key)), taskId, StringComparison.Ordinal)
            );
            if (taskFolder.Value is null)
                return 0;
            renames = taskFolder.Value;
        }

        if (!renames.TryGetValue(id, out var newId))
            return 0;
        target["id"] = newId;
        return 1;
    }

    /// <summary>Rewrites the ID in a <c>component</c>, <c>displayValue</c> or <c>linkToComponent</c> expression.</summary>
    private static int RewriteExpression(JsonArray array, Dictionary<string, string> folderRenames)
    {
        var idIndex = StringValue(array.Count > 0 ? array[0] : null) switch
        {
            "component" or "displayValue" => 1,
            "linkToComponent" => 2,
            _ => -1,
        };
        if (idIndex < 0 || array.Count <= idIndex)
            return 0;
        if (StringValue(array[idIndex]) is not { } id || !folderRenames.TryGetValue(id, out var newId))
            return 0;

        array[idIndex] = newId;
        return 1;
    }

    /// <summary>Renames the IDs in <c>components.excludeFromPdf</c> in the UI folder's Settings.json.</summary>
    private static async Task RewriteSettings(string layoutsDirectory, Dictionary<string, string> folderRenames)
    {
        var settingsFile = Path.Combine(Path.GetDirectoryName(layoutsDirectory) ?? layoutsDirectory, "Settings.json");
        if (!File.Exists(settingsFile))
            return;

        string text;
        bool hadBom;
        JsonNode? settings;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(settingsFile));
            settings = JsonNode.Parse(text, documentOptions: _jsonOptions);
        }
        catch (Exception ex) when (ex is JsonException or DecoderFallbackException)
        {
            return;
        }

        if (settings?["components"]?["excludeFromPdf"] is not JsonArray excluded)
            return;
        if (RewriteIdList(excluded, folderRenames) == 0)
            return;

        var lineEnding = text.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";
        var updated = LayoutJsonComments
            .Restore(text, settings.ToJsonString(_serializerOptions))
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace("\n", lineEnding, StringComparison.Ordinal);
        if (text.EndsWith('\n'))
            updated += lineEnding;
        await Utf8TextFile.Write(settingsFile, updated, hadBom);
    }

    /// <summary>The app's C# files that hold a renamed ID as a string literal, with the IDs each one holds.</summary>
    private static IEnumerable<(string File, List<string> Ids)> FindCodeReferences(
        string appFolder,
        Dictionary<string, Dictionary<string, string>> renames
    )
    {
        var oldIds = renames.Values.SelectMany(folder => folder.Keys).Distinct(StringComparer.Ordinal).ToList();
        var files = Directory
            .EnumerateFiles(appFolder, "*.cs", SearchOption.AllDirectories)
            .Where(file =>
            {
                var relative = Path.GetRelativePath(appFolder, file).Split(Path.DirectorySeparatorChar);
                return !relative.Contains("bin", StringComparer.Ordinal)
                    && !relative.Contains("obj", StringComparer.Ordinal);
            })
            .Order(StringComparer.Ordinal);
        foreach (var file in files)
        {
            var text = File.ReadAllText(file);
            var found = oldIds.Where(id => text.Contains($"\"{id}\"", StringComparison.Ordinal)).ToList();
            if (found.Count > 0)
                yield return (file, found);
        }
    }

    private static string LayoutsDirectory(string layoutFile) =>
        Path.GetFullPath(Path.GetDirectoryName(layoutFile) ?? layoutFile).TrimEnd(Path.DirectorySeparatorChar);

    private static string DisplayPath(string projectFolder, string path) =>
        Path.GetRelativePath(projectFolder, path).Replace('\\', '/');

    private static string? StringValue(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;
}
