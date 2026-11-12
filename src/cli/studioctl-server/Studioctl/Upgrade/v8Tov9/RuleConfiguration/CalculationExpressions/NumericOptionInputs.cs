using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;

// Option values are strings even when the app uses them as numeric calculation inputs.
internal static partial class NumericOptionInputs
{
    private static readonly JsonDocumentOptions DocumentOptions = new()
    {
        AllowDuplicateProperties = false,
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    public static IReadOnlySet<string> Load(string projectFolder, string layoutFolder, string model)
    {
        var fields = new Dictionary<string, bool>(StringComparer.Ordinal);
        var layouts = Path.Combine(layoutFolder, "layouts");
        if (!Directory.Exists(layouts))
            return new HashSet<string>(StringComparer.Ordinal);
        foreach (var path in Directory.GetFiles(layouts, "*.json").Order(StringComparer.Ordinal))
        {
            JsonNode? document;
            try
            {
                document = JsonNode.Parse(File.ReadAllText(path), documentOptions: DocumentOptions);
            }
            catch (System.Text.Json.JsonException)
            {
                return new HashSet<string>(StringComparer.Ordinal);
            }
            foreach (var component in Objects(document))
            {
                var binding = (component["dataModelBindings"] as JsonObject)?["simpleBinding"];
                var field = Text(binding) ?? (binding is JsonObject obj ? Text(obj["field"]) : null);
                var dataType = binding is JsonObject ? Text(binding["dataType"]) : null;
                if (field == null || (dataType != null && dataType != model))
                    continue;
                var numeric =
                    Text(component["type"]) is "RadioButtons" or "Dropdown"
                    && HasNumericOptions(projectFolder, component);
                field = Normalize(field);
                fields[field] = numeric && fields.GetValueOrDefault(field, true);
            }
        }
        return fields.Where(field => field.Value).Select(field => field.Key).ToHashSet(StringComparer.Ordinal);
    }

    public static string Normalize(string path) => RowIndex().Replace(path, "");

    private static bool HasNumericOptions(string projectFolder, JsonObject component)
    {
        if (component["source"] != null || component["mapping"] != null || component["queryParameters"] != null)
            return false;
        JsonNode? options = component["options"];
        if (options != null && component["optionsId"] != null)
            return false;
        if (options == null && Text(component["optionsId"]) is { } id)
        {
            if (id.Contains('/') || id.Contains('\\'))
                return false;
            var path = Path.Combine(projectFolder, "App", "options", id + ".json");
            if (!File.Exists(path))
                return false;
            try
            {
                options = JsonNode.Parse(File.ReadAllText(path), documentOptions: DocumentOptions);
            }
            catch (System.Text.Json.JsonException)
            {
                return false;
            }
        }
        return options is JsonArray { Count: > 0 } array
            && array.All(option =>
                option is JsonObject obj
                && Text(obj["value"]) is { } value
                && Number().IsMatch(value)
                && double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number)
                && double.IsFinite(number)
            );
    }

    private static string? Text(JsonNode? value) =>
        value is JsonValue scalar && scalar.TryGetValue<string>(out var text) ? text : null;

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

    [GeneratedRegex(@"\[(?:\d+|\{[01]\})\]")]
    private static partial Regex RowIndex();

    [GeneratedRegex(@"^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$")]
    private static partial Regex Number();
}
