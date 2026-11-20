using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Keeps the v8 hidden-data behavior for apps that depend on it. v9 turns <c>AppSettings:RemoveHiddenData</c> on
/// by default where v8 left it off, so when a task ends, data bound only to hidden components is deleted and
/// hidden repeating-group rows are removed. When no appsettings file sets the key and the layouts can hide bound
/// data - a hidden component that binds data or contains components that do, a hidden page with bound
/// components, or a repeating group with <c>hiddenRow</c> - this sets it to false in <c>appsettings.json</c>.
/// A component with <c>removeWhenHidden: false</c> keeps its data and is left out.
///
/// The line is inserted in place to keep formatting and comments, and the edit is kept only when the file then
/// holds the same configuration plus the setting; otherwise a to-do says what to add. Runs after the layout
/// migration, which turns RuleConfiguration.json conditional rendering into <c>hidden</c> expressions, and after
/// the layout sets have moved to UI folders, so the files it names are the ones v9 reads.
/// </summary>
internal static partial class RemoveHiddenDataSettingMigration
{
    private const int MaxListed = 5;
    private const string SectionName = "AppSettings";
    private const string SettingName = "RemoveHiddenData";

    private static readonly JsonDocumentOptions _options = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
        // Fail the parse instead of the first lookup, which throws an ArgumentException rather than a JsonException.
        AllowDuplicateProperties = false,
    };

    [GeneratedRegex("""^(\s*)"AppSettings"\s*:\s*\{\s*(//.*)?$""", RegexOptions.IgnoreCase)]
    private static partial Regex SectionStartLine();

    /// <param name="projectFolder">The repository root holding <c>App/ui</c></param>
    /// <param name="appFolder">The folder with the app's project file and appsettings files</param>
    public static async Task<MigrationResult> Migrate(string projectFolder, string appFolder)
    {
        if (AppSettingsSetRemoveHiddenData(appFolder))
            return new MigrationResult();

        var affected = await FindHiddenBoundData(projectFolder);
        if (affected.Count == 0)
            return new MigrationResult();

        var listed = string.Join(", ", affected.Take(MaxListed));
        var messages = new List<UpgradeMessage>();
        if (await TryAddSetting(Path.Combine(appFolder, "appsettings.json")))
        {
            messages.Add(
                new UpgradeMessage(
                    "v9 removes data in hidden fields by default when a task ends. This app has hidden fields that "
                        + $"hold data, such as {listed} ({affected.Count} in total), so the upgrade set "
                        + $"{SectionName}:{SettingName} to false in appsettings.json to keep the v8 behavior. To use "
                        + "the v9 behavior, remove the setting or set it to true, and set \"removeWhenHidden\": false "
                        + "on components whose data must be kept.",
                    UpgradeMessageStatus.Info
                )
            );
        }
        else
        {
            messages.Todo(
                "v9 removes data in hidden fields by default when a task ends, and this app has hidden fields that "
                    + $"hold data, such as {listed} ({affected.Count} in total). appsettings.json could not be "
                    + $"edited safely, so add \"{SectionName}\": {{ \"{SettingName}\": false }} to it to keep the v8 "
                    + "behavior."
            );
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// The layout files and components whose data v9 removes when hidden, as <c>file: id</c>.
    /// </summary>
    private static async Task<List<string>> FindHiddenBoundData(string projectFolder)
    {
        var affected = new List<string>();
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        foreach (var document in workspace?.Documents ?? [])
        {
            if ((document.Root as JsonObject)?["data"] is not JsonObject data)
                continue;

            var file = Path.GetRelativePath(projectFolder, document.FilePath);
            var components = (data["layout"] as JsonArray)?.OfType<JsonObject>().ToList() ?? [];
            var componentsById = new Dictionary<string, JsonObject>(StringComparer.Ordinal);
            foreach (var component in components)
            {
                if (IdOf(component) is { } id)
                    componentsById.TryAdd(id, component);
            }

            if (IsSet(data["hidden"]) && components.Any(BindsData))
                affected.Add($"{file} (hidden page)");

            foreach (var component in components)
            {
                if (KeepsDataWhenHidden(component))
                    continue;

                if (IsSet(component["hidden"]) && RemovesBoundData(component, componentsById, []))
                    affected.Add($"{file}: {IdOf(component)}");
                else if (IsSet(component["hiddenRow"]))
                    affected.Add($"{file}: {IdOf(component)} (hidden rows)");
            }
        }

        return affected;
    }

    /// <summary>
    /// Whether any appsettings file sets AppSettings:RemoveHiddenData. Either value means the app already chose,
    /// so neither is second-guessed. Configuration keys are case-insensitive, so they are matched that way.
    /// </summary>
    private static bool AppSettingsSetRemoveHiddenData(string appFolder)
    {
        if (!Directory.Exists(appFolder))
            return false;

        foreach (var file in Directory.EnumerateFiles(appFolder, "appsettings*.json", SearchOption.TopDirectoryOnly))
        {
            JsonNode? root;
            try
            {
                root = JsonNode.Parse(File.ReadAllText(file), documentOptions: _options);
            }
            catch (JsonException)
            {
                continue;
            }

            var section =
                (root as JsonObject)
                    ?.FirstOrDefault(p => p.Key.Equals(SectionName, StringComparison.OrdinalIgnoreCase))
                    .Value as JsonObject;
            if (section?.Any(p => p.Key.Equals(SettingName, StringComparison.OrdinalIgnoreCase)) == true)
                return true;
        }

        return false;
    }

    /// <summary>
    /// Inserts <c>"RemoveHiddenData": false</c> as the first line of the AppSettings section, or a new section as
    /// the first property of the file, and writes the file only when it then parses to the original configuration
    /// plus the setting. Keeps the BOM and line endings.
    /// </summary>
    private static async Task<bool> TryAddSetting(string file)
    {
        if (!File.Exists(file))
            return false;

        string text;
        bool hadBom;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(file));
        }
        catch (DecoderFallbackException)
        {
            return false;
        }

        if (WithSetting(text) is not { } setting || InsertLines(text, setting.HasSection) is not { } candidate)
            return false;

        try
        {
            if (!JsonNode.DeepEquals(JsonNode.Parse(candidate, documentOptions: _options), setting.Expected))
                return false;
        }
        catch (JsonException)
        {
            return false;
        }

        await Utf8TextFile.Write(file, candidate, hadBom);
        return true;
    }

    /// <summary>The file's configuration with the setting added, and whether it had an AppSettings section.</summary>
    private static (JsonNode Expected, bool HasSection)? WithSetting(string text)
    {
        JsonNode? root;
        try
        {
            root = JsonNode.Parse(text, documentOptions: _options);
        }
        catch (JsonException)
        {
            return null;
        }

        if (root is not JsonObject rootObject)
            return null;

        var sectionKey = rootObject
            .Select(p => p.Key)
            .FirstOrDefault(k => k.Equals(SectionName, StringComparison.OrdinalIgnoreCase));
        if (sectionKey is null)
        {
            rootObject.Insert(0, SectionName, new JsonObject { [SettingName] = false });
            return (rootObject, false);
        }

        if (rootObject[sectionKey] is not JsonObject section)
            return null;

        section.Insert(0, SettingName, false);
        return (rootObject, true);
    }

    /// <summary>
    /// The text with the setting's line inserted, indented like its neighbors, or null when the opening line of the
    /// section (or of the file) is not on a line of its own.
    /// </summary>
    private static string? InsertLines(string text, bool hasSection)
    {
        var lineEnd = text.Contains("\r\n", StringComparison.Ordinal) ? "\r" : "";
        var lines = text.Split('\n').ToList();
        var start = hasSection
            ? lines.FindIndex(line => SectionStartLine().IsMatch(line.TrimEnd('\r')))
            : lines.FindIndex(line => !IsBlankOrComment(line));
        if (start < 0 || (!hasSection && lines[start].Trim() != "{"))
            return null;

        var next = lines.FindIndex(start + 1, line => !IsBlankOrComment(line));
        if (next < 0)
            return null;

        var closesObject = lines[next].TrimStart().StartsWith('}');
        var comma = closesObject ? "" : ",";
        var openingIndent = Indent(lines[start]);
        if (hasSection)
        {
            var unit = openingIndent.Length > 0 ? openingIndent : "  ";
            var indent = closesObject ? openingIndent + unit : Indent(lines[next]);
            lines.Insert(start + 1, $"{indent}\"{SettingName}\": false{comma}{lineEnd}");
        }
        else
        {
            var indent = closesObject || Indent(lines[next]).Length == 0 ? "  " : Indent(lines[next]);
            lines.InsertRange(
                start + 1,
                [
                    $"{indent}\"{SectionName}\": {{{lineEnd}",
                    $"{indent}{indent}\"{SettingName}\": false{lineEnd}",
                    $"{indent}}}{comma}{lineEnd}",
                ]
            );
        }

        return string.Join('\n', lines);
    }

    private static bool IsBlankOrComment(string line) =>
        string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith("//", StringComparison.Ordinal);

    private static string Indent(string line) => line[..(line.Length - line.TrimStart().Length)];

    /// <summary>
    /// Whether hiding the component removes data: it binds data itself, or one of its children (followed
    /// through nested containers) does. A child with <c>removeWhenHidden: false</c> is not hidden by its parent.
    /// </summary>
    private static bool RemovesBoundData(
        JsonObject component,
        IReadOnlyDictionary<string, JsonObject> componentsById,
        HashSet<string> visited
    ) =>
        BindsData(component)
        || ChildIds(component)
            .Any(id =>
                visited.Add(id)
                && componentsById.TryGetValue(id, out var child)
                && !KeepsDataWhenHidden(child)
                && RemovesBoundData(child, componentsById, visited)
            );

    private static bool BindsData(JsonObject component) =>
        component["dataModelBindings"] is JsonObject { Count: > 0 } && !KeepsDataWhenHidden(component);

    private static bool KeepsDataWhenHidden(JsonObject component) =>
        component["removeWhenHidden"]?.GetValueKind() == JsonValueKind.False;

    /// <summary>A <c>hidden</c> or <c>hiddenRow</c> that is true or an expression; absent, null and false never hide.</summary>
    private static bool IsSet(JsonNode? value) => value is not null && value.GetValueKind() != JsonValueKind.False;

    private static string? IdOf(JsonObject component) =>
        component["id"] is JsonValue id && id.TryGetValue<string>(out var value) ? value : null;

    /// <summary>
    /// The ids a container refers to: <c>children</c> lists (groups, tabs, cards; a multi-page group prefixes
    /// them with <c>page:</c>) and grid cells' <c>component</c>.
    /// </summary>
    private static IEnumerable<string> ChildIds(JsonNode? node)
    {
        switch (node)
        {
            case JsonObject obj:
                foreach (var (name, value) in obj)
                {
                    if (name == "children" && value is JsonArray children)
                    {
                        foreach (var child in children.OfType<JsonValue>())
                        {
                            if (child.TryGetValue<string>(out var id))
                                yield return id[(id.IndexOf(':', StringComparison.Ordinal) + 1)..];
                        }
                    }
                    else if (name == "component" && value is JsonValue cell && cell.TryGetValue<string>(out var cellId))
                    {
                        yield return cellId;
                    }
                    else
                    {
                        foreach (var nested in ChildIds(value))
                            yield return nested;
                    }
                }
                break;
            case JsonArray array:
                foreach (var id in array.SelectMany(ChildIds))
                    yield return id;
                break;
        }
    }
}
