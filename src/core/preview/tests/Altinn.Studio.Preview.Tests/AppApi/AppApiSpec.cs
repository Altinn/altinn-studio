using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Preview.Tests.AppApi;

/// <summary>
/// The app API's OpenAPI description, which the app backend's tests keep up to date with what a v9 app answers. The
/// v9 frontend is built against it, so preview's answers must match it.
/// </summary>
internal sealed class AppApiSpec
{
    private readonly JsonObject _paths;
    private readonly JsonObject _schemas;

    private AppApiSpec(JsonObject spec)
    {
        _paths = spec["paths"] as JsonObject ?? throw new InvalidOperationException("The spec has no paths.");
        _schemas =
            spec["components"]?["schemas"] as JsonObject
            ?? throw new InvalidOperationException("The spec has no schemas.");
    }

    public static AppApiSpec Load() =>
        new(
            JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "AppApi", "app-api.json")))
                as JsonObject
                ?? throw new InvalidOperationException("The spec is not an object.")
        );

    /// <summary>
    /// How an answer differs from what the app API answers to the same request, such as a property it lacks, has in
    /// addition or has of another type.
    /// </summary>
    /// <param name="method">The request's method.</param>
    /// <param name="appPath">The request's path from the app's root, <c>/{org}/{app}/…</c>.</param>
    /// <param name="status">The answer's status.</param>
    /// <param name="body">The answer's JSON body, or <c>null</c> when it has none.</param>
    public IReadOnlyList<string> Differences(HttpMethod method, string appPath, HttpStatusCode status, JsonNode? body)
    {
        string request = $"{method} {appPath}";
        if (Operation(method, appPath) is not { } operation)
        {
            return [$"{request}: the app API has no such endpoint"];
        }

        string code = ((int)status).ToString(CultureInfo.InvariantCulture);
        if (operation["responses"]?[code] is not JsonObject response)
        {
            return [$"{request}: the app API never answers {code}"];
        }

        if (body is null || response["content"]?["application/json"]?["schema"] is not JsonObject schema)
        {
            return [];
        }

        List<string> differences = [];
        Compare(body, schema, "$", differences);
        return [.. differences.Select(difference => $"{request}: {difference}")];
    }

    /// <summary>The operation of the path that matches the most literal segments, as ASP.NET Core routes them.</summary>
    private JsonObject? Operation(HttpMethod method, string appPath)
    {
        string[] segments = appPath.Trim('/').Split('/');
        return _paths
            .Where(path => Matches(path.Key, segments))
            .OrderByDescending(path => path.Key.Split('/').Count(segment => !IsParameter(segment)))
            .Select(path =>
                (path.Value as JsonObject ?? [])
                    .FirstOrDefault(operation =>
                        string.Equals(operation.Key, method.Method, StringComparison.OrdinalIgnoreCase)
                    )
                    .Value as JsonObject
            )
            .OfType<JsonObject>()
            .FirstOrDefault();
    }

    private static bool Matches(string template, string[] segments)
    {
        string[] templateSegments = template.Trim('/').Split('/');
        return templateSegments.Length == segments.Length
            && templateSegments
                .Zip(segments)
                .All(pair =>
                    IsParameter(pair.First)
                    || string.Equals(pair.First, pair.Second, StringComparison.OrdinalIgnoreCase)
                );
    }

    private static bool IsParameter(string segment) => segment.StartsWith('{', StringComparison.Ordinal);

    private void Compare(JsonNode? node, JsonObject schema, string path, List<string> differences)
    {
        if (schema["$ref"] is JsonValue reference)
        {
            // OpenAPI 3.0 can't mark a reference as nullable, so a null one passes.
            if (node is not null)
            {
                Compare(node, Resolve(reference), path, differences);
            }

            return;
        }

        if (schema["oneOf"] is JsonArray choices)
        {
            if (!choices.OfType<JsonObject>().Any(choice => Fits(node, choice)))
            {
                differences.Add($"{path} fits none of its schemas");
            }

            return;
        }

        if (node is null)
        {
            if ((bool?)schema["nullable"] is not true && schema.Count > 0)
            {
                differences.Add($"{path} is null");
            }

            return;
        }

        if (schema["enum"] is JsonArray values && !values.Any(value => JsonNode.DeepEquals(value, node)))
        {
            differences.Add($"{path} is {node.ToJsonString()}, which is not one of its values");
        }

        switch ((string?)schema["type"])
        {
            case "object":
                CompareObject(node, schema, path, differences);
                break;
            case "array" when node is JsonArray array:
                JsonObject items = schema["items"] as JsonObject ?? [];
                for (int index = 0; index < array.Count; index++)
                {
                    Compare(array[index], items, $"{path}[{index}]", differences);
                }

                break;
            case "array":
                differences.Add($"{path} is not an array");
                break;
            case "string" when node.GetValueKind() is not JsonValueKind.String:
                differences.Add($"{path} is not a string");
                break;
            case "integer" when node is not JsonValue integer || !integer.TryGetValue(out long _):
                differences.Add($"{path} is not an integer");
                break;
            case "number" when node.GetValueKind() is not JsonValueKind.Number:
                differences.Add($"{path} is not a number");
                break;
            case "boolean" when node.GetValueKind() is not (JsonValueKind.True or JsonValueKind.False):
                differences.Add($"{path} is not a boolean");
                break;
        }
    }

    private void CompareObject(JsonNode node, JsonObject schema, string path, List<string> differences)
    {
        if (node is not JsonObject value)
        {
            differences.Add($"{path} is not an object");
            return;
        }

        JsonObject properties = schema["properties"] as JsonObject ?? [];
        foreach (
            string required in (schema["required"] as JsonArray ?? []).Select(name => (string?)name).OfType<string>()
        )
        {
            // Preview leaves out what it has no value for, where the app API answers null. A property that can't be
            // null must be there.
            if (!value.ContainsKey(required) && !(properties[required] is JsonObject property && Fits(null, property)))
            {
                differences.Add($"{path} lacks {required}");
            }
        }

        foreach ((string name, JsonNode? property) in value)
        {
            if (properties[name] is JsonObject propertySchema)
            {
                Compare(property, propertySchema, $"{path}.{name}", differences);
            }
            else if (schema["additionalProperties"] is JsonObject valueSchema)
            {
                Compare(property, valueSchema, $"{path}.{name}", differences);
            }
            else if ((bool?)schema["additionalProperties"] is false)
            {
                differences.Add($"{path}.{name} is not in the app API");
            }
        }
    }

    private bool Fits(JsonNode? node, JsonObject schema)
    {
        List<string> differences = [];
        Compare(node, schema, "$", differences);
        return differences.Count == 0;
    }

    private JsonObject Resolve(JsonValue reference)
    {
        const string Prefix = "#/components/schemas/";
        string target = (string?)reference ?? string.Empty;
        return
            target.StartsWith(Prefix, StringComparison.Ordinal)
            && _schemas[target[Prefix.Length..]] is JsonObject schema
            ? schema
            : throw new InvalidOperationException($"The spec has no schema {target}.");
    }
}
