using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;

// Expand only static checkbox domains. Existing persisted values containing unknown or duplicate
// IDs need manual cleanup; normal checkbox UI values contain unique IDs from this option list.
internal static class CalculationInputOptions
{
    private static readonly JsonDocumentOptions DocumentOptions = new()
    {
        AllowDuplicateProperties = false,
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    public static IReadOnlyDictionary<string, IReadOnlyList<string>> Load(
        string projectFolder,
        string layoutFolder,
        string model
    )
    {
        var fields = new Dictionary<string, IReadOnlyList<string>?>(StringComparer.Ordinal);
        var layouts = Path.Combine(layoutFolder, "layouts");
        if (!Directory.Exists(layouts))
            return new Dictionary<string, IReadOnlyList<string>>();
        foreach (var path in Directory.GetFiles(layouts, "*.json").Order(StringComparer.Ordinal))
        {
            JsonNode? document;
            try
            {
                document = JsonNode.Parse(File.ReadAllText(path), documentOptions: DocumentOptions);
            }
            catch (JsonException)
            {
                return new Dictionary<string, IReadOnlyList<string>>();
            }
            foreach (var component in Objects(document))
            {
                var binding = (component["dataModelBindings"] as JsonObject)?["simpleBinding"];
                var field = Text(binding) ?? (binding is JsonObject reference ? Text(reference["field"]) : null);
                var dataType = binding is JsonObject ? Text(binding["dataType"]) : null;
                if (field == null || (dataType != null && dataType != model))
                    continue;
                field = NumericOptionInputs.Normalize(field);
                var options = Text(component["type"]) == "Checkboxes" ? ReadOptions(projectFolder, component) : null;
                if (fields.TryGetValue(field, out var existing))
                    fields[field] =
                        existing != null && options != null && existing.SequenceEqual(options) ? existing : null;
                else
                    fields[field] = options;
            }
        }
        return fields
            .Where(field => field.Value != null)
            .ToDictionary(
                field => field.Key,
                field => field.Value ?? throw new InvalidOperationException("Missing checked option list."),
                StringComparer.Ordinal
            );
    }

    private static IReadOnlyList<string>? ReadOptions(string projectFolder, JsonObject component)
    {
        if (component["source"] != null || component["mapping"] != null || component["queryParameters"] != null)
            return null;
        JsonNode? options = component["options"];
        if (component["optionsId"] != null)
        {
            if (
                options != null
                || Text(component["optionsId"]) is not { Length: > 0 } id
                || id.Contains('/')
                || id.Contains('\\')
                || id is "." or ".."
            )
                return null;
            var path = Path.Combine(projectFolder, "App", "options", id + ".json");
            if (!File.Exists(path))
                return null;
            try
            {
                options = JsonNode.Parse(File.ReadAllText(path), documentOptions: DocumentOptions);
            }
            catch (JsonException)
            {
                return null;
            }
        }
        if (options is not JsonArray { Count: > 0 and <= 32 } array)
            return null;
        var values = new HashSet<string>(StringComparer.Ordinal);
        foreach (var option in array)
        {
            if (
                option is not JsonObject item
                || Text(item["value"]) is not { Length: > 0 } value
                || value.Contains(',')
                || value.ToLowerInvariant() is "null" or "true" or "false"
                || !values.Add(value)
            )
                return null;
        }
        return values.Order(StringComparer.Ordinal).ToArray();
    }

    private static string? Text(JsonNode? node) =>
        node is JsonValue scalar && scalar.TryGetValue<string>(out var value) ? value : null;

    private static IEnumerable<JsonObject> Objects(JsonNode? node)
    {
        if (node is JsonObject obj)
        {
            yield return obj;
            foreach (var child in obj.SelectMany(property => Objects(property.Value)))
                yield return child;
        }
        else if (node is JsonArray array)
            foreach (var child in array.SelectMany(Objects))
                yield return child;
    }
}
