using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Supplies the model types and fixed option domains needed to preserve JavaScript coercion.
/// </summary>
internal sealed class ConditionalRuleInputMetadata
{
    private readonly DataModelTypeResolver? _types;
    private readonly CalculationSchema? _schema;
    private readonly Dictionary<string, IReadOnlyList<string>> _options = new(StringComparer.Ordinal);

    public ConditionalRuleInputMetadata(string projectFolder, string layoutFolder)
    {
        var models = new DataModelResolver(projectFolder);
        models.LoadConfiguration();
        string? modelDataType = null;
        if (models.GetDataModelInfo(Path.GetFileName(layoutFolder)) is { } model)
        {
            modelDataType = model.DataType;
            if (!model.DataType.Contains('/') && !model.DataType.Contains('\\'))
                _schema = CalculationSchema.Load(projectFolder, model.DataType);
            var types = new DataModelTypeResolver(projectFolder);
            if (types.LoadDataModelType(model))
                _types = types;
        }
        var layouts = Path.Combine(layoutFolder, "layouts");
        if (!Directory.Exists(layouts))
            return;
        var unsafeFields = new HashSet<string>(StringComparer.Ordinal);
        foreach (var file in Directory.GetFiles(layouts, "*.json"))
        {
            JsonNode? document;
            try
            {
                document = JsonNode.Parse(
                    File.ReadAllText(file),
                    documentOptions: new() { AllowDuplicateProperties = false }
                );
            }
            catch (JsonException)
            {
                _options.Clear();
                return;
            }
            foreach (var component in Objects(document))
            {
                var binding = (component["dataModelBindings"] as JsonObject)?["simpleBinding"];
                if (
                    binding is JsonObject bindingObject
                    && Text(bindingObject["dataType"]) is { } dataType
                    && dataType != modelDataType
                )
                    continue;
                var field = Text(binding) ?? Text((binding as JsonObject)?["field"]);
                if (field == null)
                    continue;
                var options = ReadOptions(projectFolder, component);
                var values = options?.OfType<JsonObject>().Select(option => Text(option["value"])).ToList();
                if (
                    Text(component["type"]) is not ("RadioButtons" or "Dropdown" or "Checkboxes")
                    || values == null
                    || values.Count == 0
                    || values.Contains(null)
                )
                {
                    unsafeFields.Add(Normalize(field));
                    continue;
                }
                field = Normalize(field);
                var existing = _options.GetValueOrDefault(field) ?? [];
                _options[field] = existing.Concat(values.OfType<string>()).Distinct(StringComparer.Ordinal).ToList();
            }
        }
        foreach (var field in unsafeFields)
            _options.Remove(field);
    }

    public Dictionary<string, string> GetTypes(IReadOnlyDictionary<string, string> inputParams)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (name, path) in inputParams)
        {
            var type = _types?.ResolveType(Normalize(path))?.TrimEnd('?') switch
            {
                "string" => "string",
                "bool" => "boolean",
                "byte"
                or "sbyte"
                or "short"
                or "ushort"
                or "int"
                or "uint"
                or "long"
                or "ulong"
                or "float"
                or "double"
                or "decimal" => "number",
                _ => _schema?.GetScalarType(Normalize(path)),
            };
            if (type != null)
                result[name] = type;
        }
        return result;
    }

    public Dictionary<string, IReadOnlyList<string>> GetOptions(IReadOnlyDictionary<string, string> inputParams) =>
        inputParams
            .Where(input => _options.ContainsKey(Normalize(input.Value)))
            .ToDictionary(input => input.Key, input => _options[Normalize(input.Value)], StringComparer.Ordinal);

    private static string Normalize(string path) =>
        CalculationExpressions
            .NumericOptionInputs.Normalize(path)
            .Replace("{0}", "", StringComparison.Ordinal)
            .Replace("{1}", "", StringComparison.Ordinal);

    private static JsonArray? ReadOptions(string projectFolder, JsonObject component)
    {
        if (component["source"] != null || component["mapping"] != null)
            return null;
        if (component["optionsId"] == null)
            return component["options"] as JsonArray;
        // optionsId takes precedence over inline options. Nonempty query parameters
        // bypass the static list and fetch a response whose domain we cannot know here.
        if (
            component["options"] != null
            || component["queryParameters"] != null && component["queryParameters"] is not JsonObject { Count: 0 }
            || Text(component["optionsId"]) is not { Length: > 0 } id
            || id.Contains('/')
            || id.Contains('\\')
            || id is "." or ".."
        )
            return null;
        var file = Path.Combine(projectFolder, "App", "options", id + ".json");
        if (!File.Exists(file))
            return null;
        try
        {
            return JsonNode.Parse(File.ReadAllText(file), documentOptions: new() { AllowDuplicateProperties = false })
                as JsonArray;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? Text(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;

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
