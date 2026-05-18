using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Strips markdown code fences, parses JSON, and optionally validates that the top-level
/// object contains the key named in <see cref="StepDefinition.ExpectedJsonKey"/>.
/// Returns null on parse failure or missing key so the step can fall back.
/// </summary>
public sealed class DefaultResponseParser(ILogger<DefaultResponseParser> logger) : IResponseParser
{
    public JsonDocument? Parse(string response, StepDefinition stepDefinition)
    {
        var json = response.Trim();

        if (json.StartsWith("```"))
        {
            var firstNewline = json.IndexOf('\n');
            if (firstNewline >= 0)
                json = json[(firstNewline + 1)..];
        }

        if (json.EndsWith("```"))
            json = json[..^3].TrimEnd();

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json);
        }
        catch (JsonException ex)
        {
            var preview = json.Length > 500 ? json[..500] : json;
            logger.LogWarning(ex, "Step {StepName}: response is not valid JSON. First 500 chars:\n{Preview}",
                stepDefinition.Name, preview);
            return null;
        }

        if (!string.IsNullOrEmpty(stepDefinition.ExpectedJsonKey))
        {
            if (!doc.RootElement.TryGetProperty(stepDefinition.ExpectedJsonKey, out _))
            {
                var actualKeys = string.Join(", ", doc.RootElement.EnumerateObject().Select(p => p.Name));
                logger.LogWarning(
                    "Step {StepName}: response is missing expected top-level key '{Key}'. Actual keys: [{Actual}]",
                    stepDefinition.Name, stepDefinition.ExpectedJsonKey, actualKeys);
                doc.Dispose();
                return null;
            }
        }

        return doc;
    }
}
