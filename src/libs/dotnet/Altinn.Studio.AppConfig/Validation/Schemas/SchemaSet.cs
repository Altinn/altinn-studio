using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Schema;

namespace Altinn.Studio.AppConfig.Validation.Schemas;

public sealed class SchemaSet
{
    public static SchemaSet Empty { get; } =
        new(new Dictionary<string, JsonSchema>(StringComparer.Ordinal), Array.Empty<string>());

    private readonly IReadOnlyDictionary<string, JsonSchema> _byPath;

    public IReadOnlyList<string> LoadWarnings { get; }

    internal object EvaluationGate { get; } = new();

    internal EvaluationOptions Options { get; }

    private SchemaSet(IReadOnlyDictionary<string, JsonSchema> byPath, IReadOnlyList<string> loadWarnings)
    {
        _byPath = byPath;
        LoadWarnings = loadWarnings;
        Options = new EvaluationOptions { OutputFormat = OutputFormat.Hierarchical };
        foreach (var (path, schema) in byPath)
            Options.SchemaRegistry.Register(RegistryUri(path), schema);
    }

    private static Uri RegistryUri(string path) =>
        new UriBuilder
        {
            Scheme = "schema",
            Host = "",
            Path = path,
        }.Uri;

    internal JsonSchema? Get(string schemaPath) => _byPath.TryGetValue(schemaPath, out var s) ? s : null;

    public static SchemaSet FromFiles(IEnumerable<KeyValuePair<string, string>> files)
    {
        var map = new Dictionary<string, JsonSchema>(StringComparer.Ordinal);
        var warnings = new List<string>();
        foreach (var (path, text) in files)
        {
            var content = text;
            if (string.Equals(Path.GetFileName(path), ExpressionFileName, StringComparison.Ordinal))
                content = NeutralizeExpressionRecursion(content);
            JsonSchema schema;
            try
            {
                schema = JsonSchema.FromText(content);
            }
            catch (JsonException)
            {
                warnings.Add($"schema {path} could not be parsed");
                continue;
            }
            map[path] = schema;
        }
        foreach (var known in SchemaValidator.KnownSchemaPaths)
        {
            if (!map.ContainsKey(known))
                warnings.Add($"schema {known} is missing from the artifact");
        }
        return new SchemaSet(map, warnings);
    }

    private const string ExpressionFileName = "expression.schema.v1.json";

    private static readonly string[] _neutralizedExpressionDefs = { "any", "string", "boolean", "number" };

    private static string NeutralizeExpressionRecursion(string json)
    {
        using var doc = JsonDocument.Parse(json, new JsonDocumentOptions { AllowDuplicateProperties = true });
        if (doc.RootElement.ValueKind != JsonValueKind.Object)
            return json;
        if (ToNode(doc.RootElement) is not JsonObject root || root["definitions"] is not JsonObject defs)
            return json;
        foreach (var name in _neutralizedExpressionDefs)
        {
            if (defs.ContainsKey(name))
                defs[name] = new JsonObject();
        }
        return root.ToJsonString();
    }

    private static JsonNode? ToNode(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var obj = new JsonObject();
                foreach (var property in element.EnumerateObject())
                    obj[property.Name] = ToNode(property.Value);
                return obj;
            case JsonValueKind.Array:
                var arr = new JsonArray();
                foreach (var item in element.EnumerateArray())
                    arr.Add(ToNode(item));
                return arr;
            default:
                return JsonValue.Create(element.Clone());
        }
    }
}
