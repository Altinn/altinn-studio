using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Reports navigation settings that component-first precedence can make effective in v9. Settings stay in
/// place because the app team must decide whether the new validation is wanted. Runs after layout and UI
/// folder migrations so findings name the files the developer will review.
/// </summary>
internal sealed class NavigationValidationAdvisor(string projectFolder)
{
    private readonly Dictionary<string, SettingsFile> _settings = new(StringComparer.Ordinal);

    /// <summary>Identifies navigation validation changes for manual review without modifying app files.</summary>
    public async Task<MigrationResult> Analyze()
    {
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        var messages = new List<UpgradeMessage>();
        if (workspace is null)
            return new MigrationResult(messages);

        foreach (var document in workspace.Documents)
        {
            if (
                document.Root is not JsonObject root
                || root["data"] is not JsonObject data
                || data["layout"] is not JsonArray components
            )
                continue;

            var folder =
                Path.GetDirectoryName(Path.GetDirectoryName(document.FilePath))
                ?? throw new InvalidOperationException($"Layout file has no UI folder: {document.FilePath}");
            var settings = ReadSettings(Path.Combine(folder, "Settings.json"));
            var order = PageOrder(settings.Root);
            var page = Path.GetFileNameWithoutExtension(document.FilePath);
            foreach (var component in NavigationComponents(components))
            {
                var type = StringValue(component["type"]);
                var properties = string.Equals(type, "NavigationButtons", StringComparison.OrdinalIgnoreCase)
                    ? new[]
                    {
                        ("validateOnNext", NavigationDirection.Forward),
                        ("validateOnPrevious", NavigationDirection.Backward),
                    }
                    :
                    [
                        ("validateOnForward", NavigationDirection.Forward),
                        ("validateOnBackward", NavigationDirection.Backward),
                    ];
                foreach (var (property, direction) in properties)
                {
                    if (component[property] is null || !CanNavigate(data, component, page, order, direction))
                        continue;

                    var inherited = InheritedSetting(data, document.FilePath, settings, workspace.UiDirectory);
                    if (inherited is null)
                        continue;

                    AnalyzeSetting(
                        component,
                        property,
                        direction,
                        new PageContext(document.FilePath, page, order),
                        inherited,
                        messages
                    );
                }
            }
        }

        // Layout parsing failures must not turn a potentially affected app into a clean result. Other upgrade
        // jobs also report these files, but this step explains which review could not be completed.
        foreach (var issue in workspace.UnreadableFiles)
            messages.Todo(
                $"{DisplayPath(issue.FilePath)}: could not check navigation validation because the layout is not valid JSON. Fix the file and run the upgrade again."
            );
        foreach (var file in workspace.ManualConversionFiles)
            messages.Todo(
                $"{DisplayPath(file)}: finish the layout conversion and run the upgrade again to check navigation validation."
            );
        return new MigrationResult(messages);
    }

    private void AnalyzeSetting(
        JsonObject component,
        string property,
        NavigationDirection direction,
        PageContext context,
        InheritedValidation inherited,
        List<UpgradeMessage> messages
    )
    {
        var id = StringValue(component["id"]) ?? "<missing id>";
        var location = $"{DisplayPath(context.File)}, component '{id}', {property}";
        if (inherited.Error is { } error)
        {
            messages.Todo(
                $"{location}: could not determine which page, task or app validation this setting replaces in v9. {error} The settings were kept. Fix the configuration and run the upgrade again."
            );
            return;
        }

        if (
            !TryReadValidation(component[property], out var after)
            || !TryReadValidation(inherited.Config, out var before)
        )
        {
            messages.Todo(
                $"{location}: could not compare this setting with {inherited.Level}-level validation in {DisplayPath(inherited.File)}. Check that both have a valid page and list of validation types, then review navigation in v9. The settings were kept."
            );
            return;
        }

        if (direction == NavigationDirection.Backward && after.Categories == Categories.None)
            return;
        var beforePages = CheckedPages(before.Page, context.Page, context.Order);
        var afterPages = CheckedPages(after.Page, context.Page, context.Order);
        var samePages =
            before.Page == after.Page
            || (beforePages is not null && afterPages is not null && beforePages.SetEquals(afterPages));
        if (
            direction == NavigationDirection.Forward
            && (
                (before.Categories == after.Categories && samePages)
                || (before.Categories == Categories.None && after.Categories == Categories.None)
            )
        )
            return;

        var difference =
            direction == NavigationDirection.Backward
                ? $"Backward navigation will now check {DescribeCategories(after.Categories)} on {DescribePages(after.Page)}. Previously, this component allowed backward navigation without validation."
                : DescribeForward(before, after, samePages);
        var action =
            direction == NavigationDirection.Backward
                ? "continue allowing backward navigation without this validation"
                : $"continue using the {inherited.Level}-level validation";
        messages.Todo(
            $"{location}: in v9, this component setting takes priority over {inherited.Level}-level validation in {DisplayPath(inherited.File)}. {difference} The settings were kept. Review and test this behavior before deploying. Keep {property} if intended, or remove it to {action}."
        );
    }

    private InheritedValidation? InheritedSetting(JsonObject data, string layout, SettingsFile task, string ui)
    {
        if (data["validationOnNavigation"] is { } page)
            return new InheritedValidation(page, layout, "page");
        if (task.Error is not null)
            return new InheritedValidation(null, task.File, "task", task.Error);
        if (task.Root?["pages"] is JsonObject pages && pages["validationOnNavigation"] is { } local)
            return new InheritedValidation(local, task.File, "task");

        var global = ReadSettings(Path.Combine(ui, "Settings.json"));
        if (global.Error is not null)
            return new InheritedValidation(null, global.File, "app", global.Error);
        if (global.Root?["validationOnNavigation"] is { } app)
            return new InheritedValidation(app, global.File, "app");

        // The folder migration can be held back by other TODOs. Its legacy app settings still need review.
        var legacy = ReadSettings(Path.Combine(ui, "layout-sets.json"));
        if (legacy.Error is not null)
            return new InheritedValidation(null, legacy.File, "app", legacy.Error);
        return legacy.Root?["uiSettings"] is JsonObject oldSettings && oldSettings["validationOnNavigation"] is { } old
            ? new InheritedValidation(old, legacy.File, "app")
            : null;
    }

    private SettingsFile ReadSettings(string file)
    {
        if (_settings.TryGetValue(file, out var cached))
            return cached;
        SettingsFile result;
        try
        {
            if (!File.Exists(file))
                result = new SettingsFile(file, null);
            else
            {
                var text = Utf8TextFile.Decode(File.ReadAllBytes(file)).Text;
                var root = JsonNode.Parse(text, documentOptions: TaskUiSettings.JsonOptions) as JsonObject;
                result = root is not null
                    ? new SettingsFile(file, root)
                    : new SettingsFile(file, null, $"{DisplayPath(file)} must contain a JSON object.");
            }
        }
        catch (Exception exception)
            when (exception is IOException or UnauthorizedAccessException or JsonException or DecoderFallbackException)
        {
            result = new SettingsFile(file, null, $"Could not read {DisplayPath(file)}: {exception.Message}");
        }
        _settings.Add(file, result);
        return result;
    }

    private static IEnumerable<JsonObject> NavigationComponents(JsonNode node)
    {
        if (node is JsonObject obj)
        {
            if (IsTrue(obj["hidden"]))
                yield break;
            var type = StringValue(obj["type"]);
            if (
                string.Equals(type, "NavigationButtons", StringComparison.OrdinalIgnoreCase)
                || string.Equals(type, "NavigationBar", StringComparison.OrdinalIgnoreCase)
            )
                yield return obj;
            foreach (var child in obj.Select(property => property.Value).OfType<JsonNode>())
            {
                foreach (var component in NavigationComponents(child))
                    yield return component;
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.OfType<JsonNode>())
            {
                foreach (var component in NavigationComponents(child))
                    yield return component;
            }
        }
    }

    private static bool CanNavigate(
        JsonObject data,
        JsonObject component,
        string page,
        string[]? order,
        NavigationDirection direction
    )
    {
        if (IsTrue(data["hidden"]) || IsTrue(component["hidden"]))
            return false;
        if (
            direction == NavigationDirection.Backward
            && string.Equals(StringValue(component["type"]), "NavigationButtons", StringComparison.OrdinalIgnoreCase)
            && component["showBackButton"] is JsonValue back
            && back.TryGetValue<bool>(out var showBack)
            && !showBack
        )
            return false;
        if (order is null)
            return true;
        var index = Array.IndexOf(order, page);
        return index >= 0 && (direction == NavigationDirection.Forward ? index < order.Length - 1 : index > 0);
    }

    private static bool IsTrue(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<bool>(out var boolean) && boolean;

    private static string? StringValue(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;

    private static string[]? PageOrder(JsonObject? settings)
    {
        if (settings?["pages"] is not JsonObject pages)
            return null;
        if (pages["order"] is JsonArray order)
            return order.Select(StringValue).OfType<string>().ToArray();
        return pages["groups"] is JsonArray groups
            ? groups
                .OfType<JsonObject>()
                .SelectMany(group =>
                    group["order"] is JsonArray items ? items.Select(StringValue).OfType<string>() : []
                )
                .ToArray()
            : null;
    }

    private static HashSet<string>? CheckedPages(string scope, string page, string[]? order) =>
        scope switch
        {
            "current" => new HashSet<string>([page], StringComparer.Ordinal),
            _ when order is null || !order.Contains(page, StringComparer.Ordinal) => null,
            "all" => new HashSet<string>(order, StringComparer.Ordinal),
            _ => new HashSet<string>(order.Take(Array.IndexOf(order, page) + 1), StringComparer.Ordinal),
        };

    private static bool TryReadValidation(JsonNode? node, out Validation validation)
    {
        validation = new Validation("current", Categories.None);
        if (node is not JsonObject obj || obj["show"] is not JsonArray show)
            return false;
        var page = obj["page"] is null ? "current" : StringValue(obj["page"]);
        if (page is not ("current" or "currentAndPrevious" or "all"))
            return false;
        var categories = Categories.None;
        foreach (var item in show)
        {
            if (
                StringValue(item) is not { } name
                || !Enum.TryParse<Categories>(name, out var category)
                || Enum.GetName(category) != name
                || category == Categories.None
            )
                return false;
            categories |= category;
        }
        validation = new Validation(page, categories);
        return true;
    }

    private static string DescribeForward(Validation before, Validation after, bool samePages)
    {
        var changes = new List<string>();
        if (!samePages)
            changes.Add(
                $"Forward navigation will validate {DescribePages(after.Page)} instead of {DescribePages(before.Page)}."
            );
        var added = after.Categories & ~before.Categories;
        var removed = before.Categories & ~after.Categories;
        if (added != Categories.None)
            changes.Add($"Forward navigation will also check {DescribeCategories(added)}.");
        if (removed != Categories.None)
            changes.Add($"Forward navigation will no longer check {DescribeCategories(removed)}.");
        return string.Join(" ", changes);
    }

    private static string DescribePages(string scope) =>
        scope switch
        {
            "current" => "this page",
            "currentAndPrevious" => "this page and earlier pages",
            _ => "all pages in this task",
        };

    private static string DescribeCategories(Categories categories)
    {
        if (categories == Categories.All)
            return "missing required values and other validation errors";
        if (categories == Categories.AllExceptRequired)
            return "validation errors other than missing required values";
        if (categories == Categories.None)
            return "no validation errors";
        var names = new List<string>();
        foreach (
            var (category, name) in new[]
            {
                (Categories.Required, "missing required values"),
                (Categories.Schema, "values that do not match the data model"),
                (Categories.Invalid, "values that cannot be saved"),
                (Categories.Component, "component validation errors"),
                (Categories.Expression, "expression validation errors"),
                (Categories.CustomBackend, "custom backend validation errors"),
                (Categories.Backend, "other backend validation errors"),
            }
        )
            if ((categories & category) != Categories.None)
                names.Add(name);
        return string.Join(", ", names);
    }

    private string DisplayPath(string file) => Path.GetRelativePath(projectFolder, file).Replace('\\', '/');

    private enum NavigationDirection
    {
        Forward,
        Backward,
    }

    private sealed record SettingsFile(string File, JsonObject? Root, string? Error = null);

    private sealed record InheritedValidation(JsonNode? Config, string File, string Level, string? Error = null);

    private sealed record Validation(string Page, Categories Categories);

    private sealed record PageContext(string File, string Page, string[]? Order);

    // Expand the collections into actual categories: All and an explicit list of all categories perform
    // the same checks, even though the frontend's bit masks reserve additional bits for future categories.
    [Flags]
    private enum Categories
    {
        None = 0,
        Schema = 1,
        Component = 2,
        Expression = 4,
        CustomBackend = 8,
        Invalid = 16,
        Required = 32,
        Backend = 64,
        AllExceptRequired = Schema | Component | Expression | CustomBackend | Invalid,
        All = AllExceptRequired | Required,
        AllIncludingBackend = All | Backend,
    }
}
