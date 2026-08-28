using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.DeprecatedLayoutPropertiesMigration;

internal sealed record DeprecatedLayoutPropertiesMigrationResult(
    int FilesChanged,
    int QueryParametersConverted,
    int SummaryBindingsConverted,
    bool ManualActionRequired,
    IReadOnlyList<string> Warnings
);

/// <summary>
/// Rewrites the layout properties v9 removed from the components that fetch options or data lists:
/// <list type="bullet">
///   <item><c>mapping</c> becomes <c>queryParameters</c> holding <c>["dataModel", "&lt;path&gt;"]</c>
///   expressions, on the option components and <c>List</c>.</item>
///   <item><c>bindingToShowInSummary</c> on <c>List</c> becomes <c>summaryBinding</c>, which names a key
///   in <c>dataModelBindings</c> rather than repeating the data model path.</item>
/// </list>
/// <c>mapping</c> on <c>Button</c>, <c>InstantiationButton</c> and <c>PaymentDetails</c> is untouched -
/// it is prefill/refetch configuration there, not query parameters, and v9 still supports it.
/// </summary>
internal sealed class DeprecatedLayoutPropertiesMigrator
{
    /// <summary>
    /// Components whose <c>mapping</c> ended up as query parameters on an options or data list request.
    /// Both spellings of the tagged file upload are listed: <c>FileUploadWithTag</c> is what a v8 layout
    /// holds, and <c>FileUpload</c> what <see cref="FileUploadWithTagLayoutMigration"/> has already
    /// rewritten it to by the time this runs. Matching both keeps this migration independent of the order
    /// the two jobs run in.
    /// </summary>
    private static readonly HashSet<string> _componentsWithQueryParameters = new(StringComparer.Ordinal)
    {
        "Checkboxes",
        "Dropdown",
        "FileUpload",
        "FileUploadWithTag",
        "Likert",
        "LikertItem",
        "List",
        "MultipleSelect",
        "Option",
        "RadioButtons",
    };

    /// <summary>Repeating group row markers (<c>[{0}]</c>) an expression resolves on its own.</summary>
    private static readonly Regex _rowIndexMarkerPattern = new(
        @"\[\{\d+\}\]",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        // The default encoder escapes everything outside ASCII, which in a Norwegian app means every
        // "æ", "ø" and "å" in the file - and a "+" in a number format - comes back as "æ". That is
        // a content change, not a whitespace one, so the restoration below cannot undo it, and it would
        // bury the actual migration in a file-wide diff.
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly string _projectFolder;
    private readonly List<string> _warnings = [];

    public DeprecatedLayoutPropertiesMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    public async Task<DeprecatedLayoutPropertiesMigrationResult> Migrate()
    {
        var uiPath = ResolveUiPath();
        if (uiPath is null)
            return new DeprecatedLayoutPropertiesMigrationResult(0, 0, 0, false, []);

        var filesChanged = 0;
        var queryParametersConverted = 0;
        var summaryBindingsConverted = 0;
        var manualActionRequired = false;
        var changedFiles = new List<string>();

        foreach (var path in FindLayoutFiles(uiPath))
        {
            var (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(path));
            var root = JsonNode.Parse(
                text,
                new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (root is null)
                continue;

            var fileName = Path.GetFileName(path);
            var changes = MigrateComponents(root, fileName);
            manualActionRequired |= changes.ManualActionRequired;
            if (!changes.Changed)
                continue;

            // Comments never make it into the node tree, so rewriting the file from it would delete
            // them without a trace. Leave the file as it is and say so instead.
            if (ContainsComments(text))
            {
                _warnings.Add(
                    $"{fileName}: left untouched because it has comments, which a rewrite would delete. "
                        + "Convert `mapping` to `queryParameters` (and `bindingToShowInSummary` to "
                        + "`summaryBinding`) in this file by hand."
                );
                manualActionRequired = true;
                continue;
            }

            var hadTrailingNewline = text.EndsWith('\n');
            var updated = root.ToJsonString(_jsonOptions);
            if (hadTrailingNewline)
                updated += Environment.NewLine;

            await Utf8TextFile.Write(path, updated, withBom: hadBom);
            changedFiles.Add(path);
            filesChanged++;
            queryParametersConverted += changes.QueryParameters;
            summaryBindingsConverted += changes.SummaryBindings;
        }

        if (filesChanged > 0)
        {
            try
            {
                new WhitespaceRestorationProcessor(uiPath).RestoreWhitespaceOnlyChanges(changedFiles);
            }
            catch
            {
                // Formatting restoration is best-effort, for example when upgrading outside a Git repository.
            }
        }

        return new DeprecatedLayoutPropertiesMigrationResult(
            filesChanged,
            queryParametersConverted,
            summaryBindingsConverted,
            manualActionRequired,
            _warnings
        );
    }

    /// <summary>
    /// Whether <paramref name="text"/> holds a JSON comment. Uses the reader rather than a text search so
    /// that "//" inside a string value - a URL, say - is not mistaken for one.
    /// </summary>
    private static bool ContainsComments(string text)
    {
        var reader = new Utf8JsonReader(
            Encoding.UTF8.GetBytes(text),
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Allow, AllowTrailingCommas = true }
        );

        try
        {
            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.Comment)
                    return true;
            }
        }
        catch (JsonException)
        {
            // The document already parsed above, so this cannot be malformed content. Treat an
            // unreadable file as commented anyway: skipping it is the safe answer either way.
            return true;
        }

        return false;
    }

    private string? ResolveUiPath()
    {
        var appUiPath = Path.Combine(_projectFolder, "App", "ui");
        if (Directory.Exists(appUiPath))
            return appUiPath;

        var uiPath = Path.Combine(_projectFolder, "ui");
        return Directory.Exists(uiPath) ? uiPath : null;
    }

    private static IEnumerable<string> FindLayoutFiles(string uiPath) =>
        Directory
            .EnumerateFiles(uiPath, "*.json", SearchOption.AllDirectories)
            .Where(path =>
                string.Equals(Path.GetFileName(Path.GetDirectoryName(path)), "layouts", StringComparison.Ordinal)
            );

    private ComponentChanges MigrateComponents(JsonNode node, string fileName)
    {
        var changes = new ComponentChanges();
        if (node is JsonObject obj && obj["type"] is JsonValue typeValue && typeValue.TryGetValue<string>(out var type))
        {
            if (_componentsWithQueryParameters.Contains(type))
                changes.Add(ConvertMapping(obj, type, fileName));

            if (string.Equals(type, "List", StringComparison.Ordinal))
                changes.Add(ConvertSummaryBinding(obj, fileName));
        }

        foreach (var child in GetChildren(node))
            changes.Add(MigrateComponents(child, fileName));

        return changes;
    }

    /// <summary>
    /// Turns <c>mapping</c> (data model path -&gt; query parameter) into <c>queryParameters</c>
    /// (query parameter -&gt; <c>["dataModel", path]</c>), merging into any parameters already configured.
    /// </summary>
    private ComponentChanges ConvertMapping(JsonObject component, string type, string fileName)
    {
        var changes = new ComponentChanges();
        if (component["mapping"] is not JsonObject mapping)
            return changes;

        var componentId = ComponentId(component);
        var queryParameters = component["queryParameters"] as JsonObject;
        var converted = new List<KeyValuePair<string, JsonNode?>>();

        foreach (var (dataModelPath, parameterNode) in mapping)
        {
            if (parameterNode is not JsonValue parameterValue || !parameterValue.TryGetValue<string>(out var parameter))
            {
                _warnings.Add(
                    $"{fileName}: {type} '{componentId}' maps '{dataModelPath}' to a non-text query parameter name. "
                        + "Convert this entry to `queryParameters` by hand."
                );
                changes.ManualActionRequired = true;
                return changes;
            }

            if (queryParameters?.ContainsKey(parameter) == true)
            {
                _warnings.Add(
                    $"{fileName}: {type} '{componentId}' already has a `queryParameters` entry named '{parameter}', "
                        + $"so the `mapping` entry for '{dataModelPath}' was left in place. Decide which one to keep."
                );
                changes.ManualActionRequired = true;
                return changes;
            }

            converted.Add(new KeyValuePair<string, JsonNode?>(parameter, DataModelExpression(dataModelPath)));
        }

        component.Remove("mapping");
        changes.Changed = true;
        if (converted.Count == 0)
            return changes;

        if (queryParameters is null)
        {
            queryParameters = new JsonObject();
            component["queryParameters"] = queryParameters;
        }

        foreach (var (parameter, expression) in converted)
        {
            queryParameters[parameter] = expression;
            changes.QueryParameters++;
        }

        return changes;
    }

    /// <summary>
    /// Replaces <c>bindingToShowInSummary</c> (a data model path) with <c>summaryBinding</c>
    /// (the name of the matching key in <c>dataModelBindings</c>).
    /// </summary>
    private ComponentChanges ConvertSummaryBinding(JsonObject component, string fileName)
    {
        var changes = new ComponentChanges();
        if (
            component["bindingToShowInSummary"] is not JsonValue deprecatedValue
            || !deprecatedValue.TryGetValue<string>(out var field)
        )
        {
            return changes;
        }

        var componentId = ComponentId(component);
        if (component.ContainsKey("summaryBinding"))
        {
            component.Remove("bindingToShowInSummary");
            changes.SummaryBindings++;
            changes.Changed = true;
            return changes;
        }

        var bindingName = FindBindingName(component["dataModelBindings"] as JsonObject, field);
        if (bindingName is null)
        {
            _warnings.Add(
                $"{fileName}: List '{componentId}' shows '{field}' in the summary, but no key in `dataModelBindings` "
                    + "points at that field. Set `summaryBinding` to the key you want to show and remove "
                    + "`bindingToShowInSummary`."
            );
            changes.ManualActionRequired = true;
            return changes;
        }

        component.Remove("bindingToShowInSummary");
        component["summaryBinding"] = bindingName;
        changes.SummaryBindings++;
        changes.Changed = true;
        return changes;
    }

    /// <summary>
    /// Finds the key in <c>dataModelBindings</c> bound to <paramref name="field"/>. A binding is either the
    /// field itself or an object naming the data type alongside it.
    /// </summary>
    private static string? FindBindingName(JsonObject? bindings, string field)
    {
        if (bindings is null)
            return null;

        foreach (var (name, binding) in bindings)
        {
            var boundField = binding switch
            {
                JsonValue value when value.TryGetValue<string>(out var text) => text,
                JsonObject obj
                    when obj["field"] is JsonValue fieldValue && fieldValue.TryGetValue<string>(out var text) => text,
                _ => null,
            };

            if (string.Equals(boundField, field, StringComparison.Ordinal))
                return name;
        }

        return null;
    }

    /// <summary>
    /// Builds <c>["dataModel", "&lt;path&gt;"]</c>. Repeating group row markers are dropped: an expression
    /// is already resolved relative to the row the component is rendered in.
    /// </summary>
    private static JsonArray DataModelExpression(string dataModelPath) =>
        new("dataModel", _rowIndexMarkerPattern.Replace(dataModelPath, string.Empty));

    private static string ComponentId(JsonObject component) =>
        component["id"] is JsonValue idValue && idValue.TryGetValue<string>(out var id) ? id : "<no id>";

    private static IEnumerable<JsonNode> GetChildren(JsonNode node) =>
        node switch
        {
            JsonObject obj => obj.Select(property => property.Value).OfType<JsonNode>(),
            JsonArray array => array.OfType<JsonNode>(),
            _ => [],
        };

    /// <summary>
    /// What one subtree of a layout file changed. <see cref="Changed"/> is what decides whether the file is
    /// rewritten - the counters only cover the properties worth reporting, and a component can change without
    /// adding to either (an empty <c>mapping</c> is dropped, not converted).
    /// </summary>
    private sealed class ComponentChanges
    {
        public int QueryParameters { get; set; }
        public int SummaryBindings { get; set; }
        public bool Changed { get; set; }
        public bool ManualActionRequired { get; set; }

        public void Add(ComponentChanges other)
        {
            QueryParameters += other.QueryParameters;
            SummaryBindings += other.SummaryBindings;
            Changed |= other.Changed;
            ManualActionRequired |= other.ManualActionRequired;
        }
    }
}
