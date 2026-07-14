using System.Text.Json;
using Altinn.Studio.AppConfig.Documents.Text;
using Json.Schema;

namespace Altinn.Studio.AppConfig.Validation.Schemas;

internal static class SchemaValidator
{
    public const string RuleId = "JSONSCHEMA-VALID";

    private const string ApplicationMetadataSchema = "application/application-metadata.schema.v1.json";
    private const string FooterSchema = "layout/footer.schema.v1.json";
    private const string LayoutSchema = "layout/layout.schema.v1.json";
    private const string LayoutSettingsSchema = "layout/layoutSettings.schema.v1.json";
    private const string TextResourcesSchema = "text-resources/text-resources.schema.v1.json";

    internal static readonly string[] KnownSchemaPaths =
    {
        ApplicationMetadataSchema,
        FooterSchema,
        LayoutSchema,
        LayoutSettingsSchema,
        TextResourcesSchema,
    };

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
            doc = JsonDocument.Parse(data);
        }
        catch (JsonException)
        {
            return findings;
        }
        using var _ = doc;

        var schemaName = AfterLastSlash(schemaPath);
        try
        {
            EvaluationResults results;
            lock (schemas.EvaluationGate)
            {
                results = schema.Evaluate(doc.RootElement, schemas.Options);
            }
            if (results.IsValid)
                return findings;
            CollectInvalid(findings, schemaName, filePath, results);
        }
        catch (Exception ex)
        {
            findings.Add(
                new Finding(
                    RuleId,
                    $"{schemaName} : schema evaluation failed: {ex.Message}",
                    Severity.Error,
                    new SourceSpan(filePath, "")
                )
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
        EvaluationResults node
    )
    {
        if (node.IsValid)
            return;
        if (node.HasErrors && node.Errors is not null)
        {
            var pointer = node.InstanceLocation.ToString();
            // The *-Properties keywords concern a property's existence, so point the span at the
            // key name (JsonSchema.Net otherwise locates it at the value).
            var keyword = AfterLastSlash(node.EvaluationPath.ToString());
            var onKey = keyword is "additionalProperties" or "unevaluatedProperties" or "propertyNames";
            var notAllowed = keyword is "additionalProperties" or "unevaluatedProperties";
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
                    new Finding(
                        RuleId,
                        $"{schemaName} {pointer}: {message}",
                        Severity.Error,
                        new SourceSpan(filePath, pointer, Key: onKey)
                    )
                );
            }
        }
        foreach (var child in node.Details)
            CollectInvalid(findings, schemaName, filePath, child);
    }

    private static string AfterLastSlash(string s)
    {
        var idx = s.LastIndexOf('/');
        return idx >= 0 ? s[(idx + 1)..] : s;
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
