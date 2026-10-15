using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Read-only advisory: v9 turns <c>AppSettings:RemoveHiddenData</c> on by default where v8 left it off, so when a
/// task ends, data bound only to hidden components is deleted and hidden repeating-group rows are removed. Warns
/// when no appsettings file chooses a value and the layouts can hide bound data: a hidden component that binds
/// data or contains components that do, a hidden page with bound components, or a repeating group with
/// <c>hiddenRow</c>. A component with <c>removeWhenHidden: false</c> keeps its data and is left out.
///
/// Deliberately never rewritten: whether the removed data matters depends on who receives it. Runs after the
/// layout migration, which turns RuleConfiguration.json conditional rendering into <c>hidden</c> expressions,
/// and after the layout sets have moved to UI folders, so the files it names are the ones v9 reads.
/// </summary>
internal sealed class HiddenDataRemovalAdvisor
{
    private const int MaxListed = 5;

    private readonly string _projectFolder;
    private readonly string _appFolder;

    /// <param name="projectFolder">The repository root holding <c>App/ui</c></param>
    /// <param name="appFolder">The folder with the app's project file and appsettings files</param>
    public HiddenDataRemovalAdvisor(string projectFolder, string appFolder)
    {
        _projectFolder = projectFolder;
        _appFolder = appFolder;
    }

    /// <summary>
    /// Returns one warning naming the first few layout files and components whose data v9 removes when hidden,
    /// with the total count. Returns nothing when an appsettings file sets RemoveHiddenData either way.
    /// </summary>
    public async Task<MigrationResult> Analyze()
    {
        if (AppSettingsSetRemoveHiddenData())
            return new MigrationResult();

        var workspace = await LayoutMigrationWorkspace.Load(_projectFolder);
        if (workspace is null)
            return new MigrationResult();

        var affected = new List<string>();
        foreach (var document in workspace.Documents)
        {
            if ((document.Root as JsonObject)?["data"] is not JsonObject data)
                continue;

            var file = Path.GetRelativePath(_projectFolder, document.FilePath);
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

        if (affected.Count == 0)
            return new MigrationResult();

        var listed = string.Join(", ", affected.Take(MaxListed));
        var more = affected.Count > MaxListed ? $" and {affected.Count - MaxListed} more" : "";
        var messages = new List<UpgradeMessage>();
        messages.Warn(
            "v9 removes data in hidden fields when a task ends, which v8 did not do by default: data bound only to "
                + "hidden components is deleted and hidden repeating-group rows are removed, so it no longer reaches "
                + $"PDFs, shipments or archives. {affected.Count} hidden component(s) or page(s) bind data: "
                + $"{listed}{more}. To keep the v8 behavior, set \"AppSettings\": {{ \"RemoveHiddenData\": false }} "
                + "in appsettings.json, or \"removeWhenHidden\": false on individual components - and check with "
                + "whoever receives the data which of it they rely on."
        );
        return new MigrationResult(messages);
    }

    /// <summary>
    /// Whether any appsettings file sets AppSettings:RemoveHiddenData. Either value means the app already chose,
    /// so neither is second-guessed. Configuration keys are case-insensitive, so they are matched that way.
    /// </summary>
    private bool AppSettingsSetRemoveHiddenData()
    {
        if (!Directory.Exists(_appFolder))
            return false;

        foreach (var file in Directory.EnumerateFiles(_appFolder, "appsettings*.json", SearchOption.TopDirectoryOnly))
        {
            JsonDocument document;
            try
            {
                document = JsonDocument.Parse(
                    File.ReadAllBytes(file),
                    new JsonDocumentOptions { AllowTrailingCommas = true, CommentHandling = JsonCommentHandling.Skip }
                );
            }
            catch (JsonException)
            {
                continue;
            }

            using (document)
            {
                if (
                    document.RootElement.ValueKind == JsonValueKind.Object
                    && document
                        .RootElement.EnumerateObject()
                        .Any(static section =>
                            string.Equals(section.Name, "AppSettings", StringComparison.OrdinalIgnoreCase)
                            && section.Value.ValueKind == JsonValueKind.Object
                            && section
                                .Value.EnumerateObject()
                                .Any(static key =>
                                    string.Equals(key.Name, "RemoveHiddenData", StringComparison.OrdinalIgnoreCase)
                                )
                        )
                )
                {
                    return true;
                }
            }
        }

        return false;
    }

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
