using System.Globalization;
using System.Text.Json;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Parsers;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.AppConfig.Validation.Schemas;

internal static class SchemaValidator
{
    public const string RuleId = "JSONSCHEMA-VALID";

    public static RuleMetadata Metadata { get; } =
        new(
            RuleId,
            "Config file must match its Altinn.App JSON schema",
            "applicationmetadata.json, the text resources, footer.json, Settings.json and the layout "
                + "files must match the JSON schemas published for the app's Altinn.App version, which "
                + "are fetched from app-dist and cached. The global App/ui/Settings.json holds the page "
                + "settings that apply to every layout folder, so it is checked against the layout "
                + "settings schema's GlobalPageSettingsFromSchema definition rather than the whole "
                + "schema. A property the schema does not permit, a missing required property or a "
                + "value of the wrong type is reported where it occurs. A key repeated within an object "
                + "is checked with its last value, the one the app reads; UNIQUE-JSON-KEY reports the "
                + "repetition. "
                + "Properties and text resource bindings that a Custom component adds beyond the schema "
                + "are not reported, because the app frontend passes them on to its web component. "
                + "Schema validation is skipped, with a notice, when the app's exact Altinn.App version "
                + "can't be determined, or when app-dist is unreachable and the schemas for that version "
                + "are not cached.",
            Severity.Error
        );

    private const string ApplicationMetadataSchema = "application/application-metadata.schema.v1.json";
    private const string ExpressionSchema = "layout/expression.schema.v1.json";
    private const string FooterSchema = "layout/footer.schema.v1.json";
    private const string LayoutSchema = "layout/layout.schema.v1.json";
    private const string LayoutSettingsSchema = "layout/layoutSettings.schema.v1.json";
    private const string TextResourcesSchema = "text-resources/text-resources.schema.v1.json";

    private const string GlobalSettingsFile = "App/ui/Settings.json";

    internal static readonly string[] KnownSchemaPaths =
    {
        ApplicationMetadataSchema,
        ExpressionSchema,
        FooterSchema,
        LayoutSchema,
        LayoutSettingsSchema,
        TextResourcesSchema,
    };

    internal static readonly SchemaDefinition GlobalSettingsDefinition = new(
        LayoutSettingsSchema,
        "GlobalPageSettingsFromSchema",
        GlobalSettingsFile
    );

    internal static readonly SchemaDefinition[] KnownDefinitions = { GlobalSettingsDefinition };

    public static IReadOnlyList<Finding> Validate(SchemaSet schemas, string filePath, byte[] data)
    {
        var findings = new List<Finding>();
        var schemaPath = SchemaPathFor(filePath);
        if (schemaPath is null)
            return findings;
        var schema = schemas.Get(schemaPath);
        if (schema is null)
            return findings;

        JsonDocument doc;
        try
        {
            doc = JsonRead.ParseAppFile(data);
        }
        catch (JsonException)
        {
            return findings;
        }
        using var _ = doc;

        var schemaName = SchemaName(schemaPath);
        try
        {
            EvaluationResults results;
            lock (schemas.EvaluationGate)
            {
                results = schema.Evaluate(doc.RootElement, schemas.Options);
            }
            if (results.IsValid)
                return findings;
            var layout = schemaPath == LayoutSchema ? doc.RootElement : (JsonElement?)null;
            CollectInvalid(findings, schemaName, filePath, layout, results);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            findings.Add(
                Report($"{schemaName} : schema evaluation failed: {ex.Message}", new SourceSpan(filePath, ""))
            );
        }
        return findings;
    }

    // The evaluation tree carries errors under valid nodes too (the non-matching branches of a
    // satisfied oneOf/anyOf); pruning at valid nodes keeps those out of the findings.
    private static void CollectInvalid(
        List<Finding> findings,
        string schemaName,
        string filePath,
        JsonElement? layout,
        EvaluationResults node
    )
    {
        if (node.IsValid)
            return;
        var keyword = AfterLastSlash(node.EvaluationPath.ToString());
        var notAllowed = keyword is "additionalProperties" or "unevaluatedProperties";
        var passedToWebComponent =
            notAllowed && layout is { } root && IsCustomComponentProperty(root, node.InstanceLocation);
        if (node.HasErrors && node.Errors is not null && !passedToWebComponent)
        {
            var pointer = node.InstanceLocation.ToString();
            // The *-Properties keywords concern a property's existence, so point the span at the
            // key name (JsonSchema.Net otherwise locates it at the value).
            var onKey = notAllowed || keyword is "propertyNames";
            foreach (var (key, msg) in node.Errors)
            {
                // additionalProperties:false yields the opaque "All values fail against
                // the false schema" — say what actually happened.
                string message;
                if (string.IsNullOrEmpty(key))
                    message = notAllowed ? "property is not permitted by the schema" : msg;
                else
                    message = $"{key}: {msg}";
                findings.Add(
                    Report($"{schemaName} {pointer}: {message}", new SourceSpan(filePath, pointer, Key: onKey))
                );
            }
        }
        foreach (var child in node.Details)
            CollectInvalid(findings, schemaName, filePath, layout, child);
    }

    private static bool IsCustomComponentProperty(JsonElement layout, JsonPointer at)
    {
        var onComponent = at.Count == 4;
        var onTextResourceBinding = at.Count == 5 && at[3] == "textResourceBindings";
        if (!(onComponent || onTextResourceBinding) || at[0] != "data" || at[1] != "layout")
            return false;
        return int.TryParse(at[2], NumberStyles.None, CultureInfo.InvariantCulture, out var index)
            && layout.ValueKind == JsonValueKind.Object
            && layout.TryGetProperty("data", out var data)
            && data.ValueKind == JsonValueKind.Object
            && data.TryGetProperty("layout", out var components)
            && components.ValueKind == JsonValueKind.Array
            && index < components.GetArrayLength()
            && components[index] is { ValueKind: JsonValueKind.Object } component
            && JsonRead.TryString(component, "type") == "Custom";
    }

    private static Finding Report(string message, SourceSpan at) =>
        Metadata.Report(message, at, Metadata.DefaultSeverity);

    private static string AfterLastSlash(string s)
    {
        var idx = s.LastIndexOf('/');
        return idx >= 0 ? s[(idx + 1)..] : s;
    }

    private static string SchemaName(string schemaPath)
    {
        var fragment = schemaPath.IndexOf('#', StringComparison.Ordinal);
        return fragment < 0
            ? AfterLastSlash(schemaPath)
            : AfterLastSlash(schemaPath[..fragment]) + schemaPath[fragment..];
    }

    internal static string? SchemaPathFor(string filePath)
    {
        if (string.Equals(filePath, "App/config/applicationmetadata.json", StringComparison.OrdinalIgnoreCase))
            return ApplicationMetadataSchema;
        if (
            filePath.StartsWith("App/config/texts/resource.", StringComparison.OrdinalIgnoreCase)
            && filePath.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
        )
            return TextResourcesSchema;
        if (string.Equals(filePath, "App/ui/footer.json", StringComparison.OrdinalIgnoreCase))
            return FooterSchema;
        if (string.Equals(filePath, GlobalSettingsFile, StringComparison.OrdinalIgnoreCase))
            return GlobalSettingsDefinition.Key;
        if (!filePath.StartsWith("App/ui/", StringComparison.OrdinalIgnoreCase))
            return null;
        if (string.Equals(FileName(filePath), "Settings.json", StringComparison.OrdinalIgnoreCase))
            return LayoutSettingsSchema;
        if (
            string.Equals(ParentDirectory(filePath), "layouts", StringComparison.OrdinalIgnoreCase)
            && filePath.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
        )
            return LayoutSchema;
        return null;
    }

    private static string FileName(string path) => AfterLastSlash(path);

    private static string ParentDirectory(string path)
    {
        var end = path.LastIndexOf('/');
        if (end <= 0)
            return "";
        var start = path.LastIndexOf('/', end - 1);
        return path[(start + 1)..end];
    }
}
