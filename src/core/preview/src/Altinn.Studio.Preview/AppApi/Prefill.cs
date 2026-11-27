using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>
/// The app library's prefill: a new form data element gets the data about the user and the party they act for that
/// <c>models/{dataType}.prefill.json</c> names. Each section of the file maps fields of a source to paths in the data
/// model: <c>UserProfile</c> the user's profile, <c>ER</c> the organization the party is, and <c>DSF</c> the person.
/// The user is <see cref="MockUser"/>. As in an app, <c>ER</c> has nothing when they act for themself, and <c>DSF</c>
/// nothing when they act for the organization.
/// </summary>
/// <remarks>
/// The app copies into its C# model, whose property names are the data model's without dashes, in any case, and
/// converts each value to the property's type. Preview copies into the JSON data with the data model's JSON schema.
/// Where the app fails to create the instance, for a source field or a path the data model doesn't have, preview
/// leaves the field out.
/// </remarks>
internal static class Prefill
{
    public static JsonObject Data(JsonNode? configuration, JsonNode? schema, int partyId)
    {
        var data = new JsonObject();
        if (configuration is not JsonObject config)
        {
            return data;
        }

        bool allowOverwrite = config["allowOverwrite"]?.GetValueKind() is JsonValueKind.True;
        // In the app's order. A field keeps the value it got first, unless the configuration allows overwriting.
        (string Section, JsonObject? Source)[] sources =
        [
            ("UserProfile", MockUser.ProfileForPrefill()),
            ("ER", MockUser.OrganizationForPrefill(partyId)),
            ("DSF", MockUser.PersonForPrefill(partyId)),
        ];
        foreach ((string section, JsonObject? source) in sources)
        {
            if (config[section] is not JsonObject mapping || source is null)
            {
                continue;
            }

            foreach ((string sourceField, JsonNode? target) in mapping)
            {
                if (Text(target) is { } path && Select(source, sourceField) is (true, var value))
                {
                    Assign(
                        data,
                        schema as JsonObject,
                        path.Replace("-", "", StringComparison.Ordinal),
                        value,
                        allowOverwrite
                    );
                }
            }
        }

        return data;
    }

    /// <summary>The value at a dotted path in the source, with the names exactly as the source has them.</summary>
    private static (bool Found, JsonNode? Value) Select(JsonObject source, string path)
    {
        JsonNode? current = source;
        foreach (string name in path.Split('.'))
        {
            if (current is not JsonObject node || !node.TryGetPropertyValue(name, out current))
            {
                return (false, null);
            }
        }

        return (true, current);
    }

    private static void Assign(JsonObject data, JsonObject? schema, string target, JsonNode? value, bool allowOverwrite)
    {
        // The whole path first, so that a path the data model lacks adds no objects.
        List<(string Name, JsonObject? Schema)> path = [];
        JsonObject? currentSchema = schema;
        foreach (string key in target.Split('.'))
        {
            if ((schema is null ? (key, null) : Property(schema, currentSchema, key)) is not { } property)
            {
                return;
            }

            path.Add(property);
            currentSchema = property.Schema;
        }

        JsonObject current = data;
        foreach ((string name, _) in path[..^1])
        {
            if (current[name] is not JsonObject next)
            {
                if (current[name] is not null)
                {
                    return;
                }

                next = [];
                current[name] = next;
            }

            current = next;
        }

        (string field, JsonObject? fieldSchema) = path[^1];
        if ((current[field] is null || allowOverwrite) && Convert(value, schema, fieldSchema) is (true, var converted))
        {
            current[field] = converted;
        }
    }

    /// <summary>The property that the app's C# model names <paramref name="key"/>: without dashes, in any case.</summary>
    private static (string Name, JsonObject? Schema)? Property(JsonObject root, JsonObject? schema, string key)
    {
        foreach (JsonObject candidate in Alternatives(root, schema))
        {
            if (candidate["properties"] is not JsonObject properties)
            {
                continue;
            }

            foreach ((string name, JsonNode? propertySchema) in properties)
            {
                if (
                    string.Equals(
                        name.Replace("-", "", StringComparison.Ordinal),
                        key,
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                {
                    return (name, propertySchema as JsonObject);
                }
            }
        }

        return null;
    }

    /// <summary>The schema and those it refers to or combines, as JSON schemas for data models have them.</summary>
    private static IEnumerable<JsonObject> Alternatives(JsonObject root, JsonObject? schema)
    {
        HashSet<JsonObject> seen = new(ReferenceEqualityComparer.Instance);
        Stack<JsonObject> pending = new();
        if (schema is not null)
        {
            pending.Push(schema);
        }

        while (pending.TryPop(out JsonObject? current))
        {
            if (!seen.Add(current))
            {
                continue;
            }

            yield return current;
            if (Text(current["$ref"]) is { } reference && Resolve(root, reference) is { } target)
            {
                pending.Push(target);
            }

            foreach (string combination in (string[])["allOf", "anyOf", "oneOf"])
            {
                foreach (JsonObject part in (current[combination] as JsonArray ?? []).OfType<JsonObject>())
                {
                    pending.Push(part);
                }
            }
        }
    }

    private static JsonObject? Resolve(JsonObject root, string reference)
    {
        if (!reference.StartsWith("#/", StringComparison.Ordinal))
        {
            return null;
        }

        JsonNode? current = root;
        foreach (string segment in reference[2..].Split('/'))
        {
            current = current?[
                segment.Replace("~1", "/", StringComparison.Ordinal).Replace("~0", "~", StringComparison.Ordinal)
            ];
        }

        return current as JsonObject;
    }

    /// <summary>
    /// The value as the field's type, as the app converts it to its property's type. A value the type can't hold isn't
    /// copied, where the app fails to create the instance.
    /// </summary>
    private static (bool Converted, JsonNode? Value) Convert(JsonNode? value, JsonObject? root, JsonObject? schema)
    {
        if (value is not JsonValue scalar)
        {
            return (true, value?.DeepClone());
        }

        HashSet<string> types = root is null || schema is null ? [] : Types(root, schema);
        JsonValueKind kind = scalar.GetValueKind();
        if (types.Contains("string"))
        {
            return kind switch
            {
                JsonValueKind.String => (true, scalar.DeepClone()),
                JsonValueKind.Number => (true, JsonValue.Create(scalar.ToJsonString())),
                JsonValueKind.True => (true, JsonValue.Create("True")),
                JsonValueKind.False => (true, JsonValue.Create("False")),
                _ => (false, null),
            };
        }

        if (types.Contains("integer") || types.Contains("number"))
        {
            return kind switch
            {
                JsonValueKind.Number => (true, scalar.DeepClone()),
                JsonValueKind.String
                    when decimal.TryParse(
                        (string?)scalar ?? string.Empty,
                        NumberStyles.Number,
                        CultureInfo.InvariantCulture,
                        out decimal number
                    ) => (true, JsonValue.Create(number)),
                _ => (false, null),
            };
        }

        if (types.Contains("boolean"))
        {
            return kind switch
            {
                JsonValueKind.True or JsonValueKind.False => (true, scalar.DeepClone()),
                JsonValueKind.String when bool.TryParse((string?)scalar ?? string.Empty, out bool flag) => (
                    true,
                    JsonValue.Create(flag)
                ),
                _ => (false, null),
            };
        }

        return (true, scalar.DeepClone());
    }

    private static string? Text(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue(out string? text) ? text : null;

    private static HashSet<string> Types(JsonObject root, JsonObject schema) =>
        [
            .. Alternatives(root, schema)
                .Select(alternative => alternative["type"])
                .SelectMany(type =>
                    type switch
                    {
                        JsonArray names => names.Select(name => (string?)name),
                        JsonValue name when name.GetValueKind() is JsonValueKind.String => [(string?)name],
                        _ => [],
                    }
                )
                .OfType<string>(),
        ];
}
