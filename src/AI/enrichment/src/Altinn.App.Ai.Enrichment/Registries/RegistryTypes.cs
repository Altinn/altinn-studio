using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Registries;

/// <summary>
/// Key→object registry: <c>{ default?: {...}, entries: { key: {...} } }</c>.
/// Each entry is a free-form JSON object passed through to consumers verbatim;
/// the image has no knowledge of which fields live inside.
/// </summary>
public sealed class LookupRegistry
{
    public Dictionary<string, JsonElement>? Default { get; init; }
    public Dictionary<string, Dictionary<string, JsonElement>> Entries { get; init; } = new();

    public Dictionary<string, JsonElement>? Find(string? key)
    {
        if (key != null && Entries.TryGetValue(key, out var entry))
            return entry;
        return Default;
    }
}

/// <summary>
/// Direct value mapping registry: <c>{ default, mapping: { input: output } }</c> plus an optional
/// list of supplementary strings (e.g. references, footnotes) used by templates.
/// </summary>
public sealed class MappingRegistry
{
    public string Default { get; init; } = "";
    public List<string> References { get; init; } = new();
    public Dictionary<string, string> Mapping { get; init; } = new(StringComparer.OrdinalIgnoreCase);

    public string Map(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return Default;
        return Mapping.TryGetValue(input, out var mapped) ? mapped : Default;
    }
}

/// <summary>
/// Rule-based mapping registry. Each rule lists substrings the input must contain
/// (either any or all, controlled by <see cref="MappingRule.RequireAll"/>) and the
/// value to return on match. A rule with <see cref="MappingRule.Fallback"/> = true
/// is used when nothing else matches; otherwise <see cref="Default"/> is returned.
/// </summary>
public sealed class RuleBasedRegistry
{
    public string Default { get; init; } = "";
    public List<MappingRule> Rules { get; init; } = new();

    public string Match(string? input)
    {
        if (string.IsNullOrEmpty(input))
        {
            var fallback = Rules.FirstOrDefault(r => r.Fallback);
            return fallback?.Value ?? Default;
        }

        var normalized = input.ToLowerInvariant().Replace(" ", "").Replace("-", "");
        foreach (var rule in Rules)
        {
            if (rule.Fallback)
                continue;

            var matches = rule.RequireAll
                ? rule.Contains.All(c => normalized.Contains(c, StringComparison.OrdinalIgnoreCase))
                : rule.Contains.Any(c => normalized.Contains(c, StringComparison.OrdinalIgnoreCase));

            if (matches)
                return rule.Value;
        }

        var defaultRule = Rules.FirstOrDefault(r => r.Fallback);
        return defaultRule?.Value ?? Default;
    }
}

public sealed class MappingRule
{
    public List<string> Contains { get; init; } = new();
    public bool RequireAll { get; init; }
    public bool Fallback { get; init; }
    public required string Value { get; init; }
}

/// <summary>
/// Output schema: declares the sections + items the orchestrator should aggregate
/// verdicts into. Items without a verdict get the default status.
/// </summary>
public sealed class OutputSchema
{
    public string DefaultStatus { get; init; } = "ikke_vurdert";
    public List<OutputSection> Sections { get; init; } = new();
}

public sealed class OutputSection
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public List<OutputItem> Items { get; init; } = new();
}

public sealed class OutputItem
{
    public required string Id { get; init; }
    public required string Label { get; init; }
}
