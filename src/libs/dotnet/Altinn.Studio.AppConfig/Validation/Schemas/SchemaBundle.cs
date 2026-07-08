using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Schema;

namespace Altinn.Studio.AppConfig.Validation.Schemas;

internal static class SchemaBundle
{
    // Must match both the $schema URLs the validated files declare and the embedded snapshots.
    private const string FrontendMajorVersion = "4";
    private const string Base =
        "https://altinncdn.no/toolkits/altinn-app-frontend/" + FrontendMajorVersion + "/schemas/json";

    // Order: expression must be registered before layout, which $refs it.
    private static readonly (string Url, string ResourceSuffix)[] _embedded =
    {
        ($"{Base}/layout/expression.schema.v1.json", "expression.schema.v1.json"),
        ($"{Base}/application/application-metadata.schema.v1.json", "application-metadata.schema.v1.json"),
        ($"{Base}/layout/layout.schema.v1.json", "layout.schema.v1.json"),
        ($"{Base}/layout/layoutSettings.schema.v1.json", "layoutSettings.schema.v1.json"),
        ($"{Base}/layout/footer.schema.v1.json", "footer.schema.v1.json"),
        ($"{Base}/text-resources/text-resources.schema.v1.json", "text-resources.schema.v1.json"),
    };

    private static readonly Lazy<IReadOnlyDictionary<string, JsonSchema>> _byUrl = new(LoadAll);

    public static JsonSchema? Get(string schemaUrl) => _byUrl.Value.TryGetValue(schemaUrl, out var s) ? s : null;

    private const string ExpressionSuffix = "expression.schema.v1.json";

    // The recursive entry points of expression.schema; {} keeps their $refs resolvable.
    private static readonly string[] _neutralizedExpressionDefs = { "any", "string", "boolean", "number" };

    private static IReadOnlyDictionary<string, JsonSchema> LoadAll()
    {
        var map = new Dictionary<string, JsonSchema>(StringComparer.Ordinal);
        foreach (var (url, suffix) in _embedded)
        {
            var data = ReadEmbedded(suffix);
            if (data is null)
                continue;
            var text = System.Text.Encoding.UTF8.GetString(data);
            if (string.Equals(suffix, ExpressionSuffix, StringComparison.Ordinal))
                text = NeutralizeExpressionRecursion(text);
            var schema = JsonSchema.FromText(text);
            // Cross-schema $refs resolve via the registry: each schema must sit under its canonical URI.
            SchemaRegistry.Global.Register(new Uri(url), schema);
            map[url] = schema;
        }
        return map;
    }

    private static string NeutralizeExpressionRecursion(string json)
    {
        if (JsonNode.Parse(json) is not JsonObject root || root["definitions"] is not JsonObject defs)
            return json;
        foreach (var name in _neutralizedExpressionDefs)
        {
            if (defs.ContainsKey(name))
                defs[name] = new JsonObject();
        }
        return root.ToJsonString();
    }

    private static byte[]? ReadEmbedded(string suffix)
    {
        var asm = typeof(SchemaBundle).Assembly;
        var name = asm.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith(suffix, StringComparison.Ordinal));
        if (name is null)
            return null;
        using var stream = asm.GetManifestResourceStream(name);
        if (stream is null)
            return null;
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        return ms.ToArray();
    }
}
