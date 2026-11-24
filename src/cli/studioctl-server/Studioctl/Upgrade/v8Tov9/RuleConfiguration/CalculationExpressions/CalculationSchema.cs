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
        catch (Exception exception) when (exception is JsonException or IOException or UnauthorizedAccessException)
        {
            return new(path, null, false);
        }
    }

    public bool CanAllowNull(string field) =>
        missing || (FindProperty(field, forWrite: true) is { } property && Resolve(property.Schema) != null);

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
            if (FindProperty(field, forWrite: true) is not { } property || AcceptsNull(property.Schema))
                continue;
            if (FindProperty(field, forWrite: true, isolate: true) is not { } writable)
                continue;
            property = writable;
            var schema = property.Schema;
            // References and enum/composition constraints must stay on the non-null branch.
            // anyOf keeps null valid even when the original schema already accepts it implicitly.
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
            {
                var original = schema.DeepClone();
                // The frontend supports a scalar type inside anyOf, not a singleton type array.
                if (original["type"] is JsonArray branchTypes)
                {
                    var nonNull = branchTypes.Where(type => !IsNullType(type)).ToArray();
                    if (nonNull.Length == 1)
                        original["type"] = nonNull[0]?.DeepClone();
                }
                property.Properties[property.Name] = new JsonObject
                {
                    ["anyOf"] = new JsonArray(original, new JsonObject { ["type"] = "null" }),
                };
            }
            changed = true;
        }
        return changed ? document?.ToJsonString(new JsonSerializerOptions { WriteIndented = true }) + "\n" : null;
    }

    private (JsonObject Properties, string Name, JsonObject Schema)? FindProperty(
        string field,
        JsonObject? root = null,
        bool forWrite = false,
        bool isolate = false
    )
    {
        JsonObject? node = root ?? document;
        var parts = field.Split('.');
        for (var index = 0; index < parts.Length; index++)
        {
            node = ResolveAncestor(node, forWrite, isolate);
            if (node?["items"] is JsonObject items)
                node = ResolveAncestor(items, forWrite, isolate);
            var key = RowIndex().Replace(parts[index], "");
            if (node?["properties"] is not JsonObject properties || properties[key] is not JsonObject property)
                return null;
            if (index == parts.Length - 1)
                return (properties, key, property);
            node = property;
        }
        return null;
    }

    private JsonObject? ResolveAncestor(JsonObject? node, bool forWrite, bool isolate)
    {
        var resolved = Resolve(node, pureReferences: forWrite);
        if (!forWrite || node == null || !node.ContainsKey("$ref"))
            return resolved;
        // Inline only this use of a shared definition, so other model paths stay unchanged.
        // A reference with sibling constraints cannot be replaced by its target alone.
        if (node.Count != 1 || resolved == null)
            return null;
        if (!isolate)
            return resolved;
        var copy = resolved.DeepClone().AsObject();
        node.Clear();
        foreach (var (key, value) in copy)
            node[key] = value?.DeepClone();
        return node;
    }

    private JsonObject? Resolve(JsonObject? node, bool pureReferences = false)
    {
        var visited = new HashSet<string>(StringComparer.Ordinal);
        while (node?["$ref"] is JsonValue value && value.TryGetValue<string>(out var reference))
        {
            if (pureReferences && node.Count != 1)
                return null;
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

    private bool AcceptsNull(JsonNode? node, int depth = 0)
    {
        if (depth > 32)
            return false;
        if (node is JsonValue boolean && boolean.TryGetValue<bool>(out var accepts))
            return accepts;
        if (node is not JsonObject schema)
            return false;
        if (schema.ContainsKey("$ref") && !AcceptsNull(Resolve(schema), depth + 1))
            return false;
        if (schema["type"] is { } type && !IsNullType(type) && !(type is JsonArray types && types.Any(IsNullType)))
            return false;
        if (schema["enum"] is JsonArray choices && !choices.Any(value => value == null))
            return false;
        if (schema.ContainsKey("const") && schema["const"] != null)
            return false;
        if (schema["allOf"] is JsonArray all && !all.All(option => AcceptsNull(option, depth + 1)))
            return false;
        if (schema["anyOf"] is JsonArray any && !any.Any(option => AcceptsNull(option, depth + 1)))
            return false;
        if (schema["oneOf"] is JsonArray one && one.Count(option => AcceptsNull(option, depth + 1)) != 1)
            return false;
        return !schema.ContainsKey("not") || !AcceptsNull(schema["not"], depth + 1);
    }

    private static bool IsNullType(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var type) && type == "null";

    [GeneratedRegex(@"\[\d+\]")]
    private static partial Regex RowIndex();
}
