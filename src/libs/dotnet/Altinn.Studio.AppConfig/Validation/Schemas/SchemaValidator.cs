using System.Text.Json;
using Altinn.Studio.AppConfig.Documents.Text;
using Json.Schema;

namespace Altinn.Studio.AppConfig.Validation.Schemas;

internal static class SchemaValidator
{
    public const string RuleId = "JSONSCHEMA-VALID";

    private static readonly object _evaluationGate = new();

    public static IReadOnlyList<Finding> Validate(string filePath, byte[] data)
    {
        var findings = new List<Finding>();
        var schemaUrl = ExtractDeclaredSchemaUrl(data);
        if (schemaUrl is null)
            return findings;
        var schema = SchemaBundle.Get(schemaUrl);
        if (schema is null)
        {
            if (schemaUrl.Contains("altinncdn.no", StringComparison.OrdinalIgnoreCase))
                findings.Add(
                    new Finding(
                        RuleId,
                        $"$schema \"{schemaUrl}\" is not in the bundled schema set — file not schema-checked",
                        Severity.Info,
                        new SourceSpan(filePath, "/$schema")
                    )
                );
            return findings;
        }

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

        var schemaName = AfterLastSlash(schemaUrl);
        try
        {
            // JsonSchema.Net builds a schema's constraints lazily on first Evaluate; that build is
            // not thread-safe, and the bundle schemas are shared singletons.
            EvaluationResults results;
            lock (_evaluationGate)
            {
                results = schema.Evaluate(
                    doc.RootElement,
                    new EvaluationOptions { OutputFormat = OutputFormat.Hierarchical }
                );
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

    private static string? ExtractDeclaredSchemaUrl(byte[] data)
    {
        try
        {
            using var doc = JsonDocument.Parse(data);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return null;
            return doc.RootElement.TryGetProperty("$schema", out var s) && s.ValueKind == JsonValueKind.String
                ? s.GetString()
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
