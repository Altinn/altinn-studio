using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;

// The frontend uses the schema to decide whether a null calculation may clear a field.
// Legacy schemas can omit null even when the corresponding C# property is nullable.
internal sealed partial class CalculationSchema(string filePath, JsonObject? document, bool missing)
{
    public string FilePath { get; } = filePath;

    public static CalculationSchema Load(string projectFolder, string model)
    {
        var path = Path.Combine(projectFolder, "App", "models", model + ".schema.json");
        if (!File.Exists(path))
            return new(path, null, true);
        try
        {
            return new(
                path,
                JsonNode.Parse(File.ReadAllText(path), documentOptions: new() { AllowDuplicateProperties = false })
                    as JsonObject,
                false
            );
        }
        catch (JsonException)
        {
            return new(path, null, false);
        }
    }

    public bool CanAllowNull(string field) =>
        missing || (FindProperty(field) is { } property && Resolve(property.Schema) != null);

    // Enum CLR names do not reveal their wire type. The schema can still establish a
    // scalar type, provided every non-null alternative agrees.
    public string? GetScalarType(string field)
    {
        var property = FindProperty(field);
        // XML-derived schemas can retain a sole document element which the JSON model
        // does not have. Use it only for type lookup, never to redirect schema writes.
        if (property == null && Resolve(document)?["properties"] is JsonObject { Count: 1 } roots)
            property = FindProperty(field, roots.GetAt(0).Value as JsonObject);
        var type = property is { } found ? ScalarType(found.Schema, 0) : null;
        return type is "string" or "number" or "boolean" ? type : null;
    }

    private string? ScalarType(JsonObject? schema, int depth)
    {
        if (depth > 16 || Resolve(schema) is not { } resolved)
            return null;
        IEnumerable<string?> types;
        if (resolved["type"] is JsonValue type && type.TryGetValue<string>(out var name))
            types = [name];
        else if (resolved["type"] is JsonArray typeList)
            types = typeList.Select(item =>
                item is JsonValue value && value.TryGetValue<string>(out var text) ? text : null
            );
        else if ((resolved["oneOf"] ?? resolved["anyOf"]) is JsonArray alternatives)
            types = alternatives.Select(alternative => ScalarType(alternative as JsonObject, depth + 1));
        else
            return null;
        var declared = types.ToArray();
        if (declared.Length > 0 && declared.All(type => type == "null"))
            return "null";
        var unique = declared
            .Select(type => type == "integer" ? "number" : type)
            .Where(type => type != "null")
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        return unique.Length == 1 && unique[0] is "string" or "number" or "boolean" ? unique[0] : null;
    }

    public string? AllowNull(IEnumerable<string> fields)
    {
        var changed = false;
        foreach (var field in fields.Distinct(StringComparer.Ordinal))
        {
            if (FindProperty(field) is not { } property)
                continue;
            var schema = property.Schema;
            if (AcceptsNull(schema))
                continue;
            // References and enum/composition constraints must stay on the non-null branch.
            // oneOf also lets the frontend resolve the original scalar type for numeric results.
            var wrap =
                schema.ContainsKey("$ref")
                || schema.ContainsKey("enum")
                || schema.ContainsKey("const")
                || schema.ContainsKey("allOf")
                || schema.ContainsKey("anyOf")
                || schema.ContainsKey("oneOf")
                || schema.ContainsKey("not");
            if (!wrap && schema["type"] is JsonValue type && type.TryGetValue<string>(out var name))
                schema["type"] = new JsonArray(name, "null");
            else if (!wrap && schema["type"] is JsonArray types)
                types.Add("null");
            else
                property.Properties[property.Name] = new JsonObject
                {
                    ["oneOf"] = new JsonArray(schema.DeepClone(), new JsonObject { ["type"] = "null" }),
                };
            changed = true;
        }
        return changed ? document?.ToJsonString(new JsonSerializerOptions { WriteIndented = true }) + "\n" : null;
    }

    private (JsonObject Properties, string Name, JsonObject Schema)? FindProperty(string field, JsonObject? root = null)
    {
        JsonObject? node = root ?? document;
        var parts = field.Split('.');
        for (var index = 0; index < parts.Length; index++)
        {
            node = Resolve(node);
            if (node?["items"] is JsonObject items)
                node = Resolve(items);
            var key = RowIndex().Replace(parts[index], "");
            if (node?["properties"] is not JsonObject properties || properties[key] is not JsonObject property)
                return null;
            if (index == parts.Length - 1)
                return (properties, key, property);
            node = property;
        }
        return null;
    }

    private JsonObject? Resolve(JsonObject? node)
    {
        var visited = new HashSet<string>(StringComparer.Ordinal);
        while (node?["$ref"] is JsonValue value && value.TryGetValue<string>(out var reference))
        {
            if (!reference.StartsWith("#/", StringComparison.Ordinal) || !visited.Add(reference))
                return null;
            JsonNode? target = document;
            foreach (var key in reference[2..].Split('/'))
                target = (target as JsonObject)?[
                    key.Replace("~1", "/", StringComparison.Ordinal).Replace("~0", "~", StringComparison.Ordinal)
                ];
            node = target as JsonObject;
        }
        return node;
    }

    private bool AcceptsNull(JsonObject schema)
    {
        var resolved = Resolve(schema);
        return IsNullType(resolved?["type"])
            || (resolved?["type"] is JsonArray types && types.Any(IsNullType))
            || HasNullAlternative(resolved?["anyOf"])
            || HasNullAlternative(resolved?["oneOf"]);
    }

    private bool HasNullAlternative(JsonNode? node) =>
        node is JsonArray alternatives
        && alternatives.OfType<JsonObject>().Any(option => IsNullType(Resolve(option)?["type"]));

    private static bool IsNullType(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var type) && type == "null";

    [GeneratedRegex(@"\[\d+\]")]
    private static partial Regex RowIndex();
}
