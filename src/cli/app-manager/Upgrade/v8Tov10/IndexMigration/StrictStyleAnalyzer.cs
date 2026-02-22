using System.Text;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

/// <summary>
/// Result of analyzing an inline style
/// </summary>
internal sealed record StyleAnalysisResult
{
    /// <summary>
    /// Whether this is a standard template style (safe to delete)
    /// </summary>
    public required bool IsStandard { get; init; }

    /// <summary>
    /// Human-readable description
    /// </summary>
    public required string Description { get; init; }

    /// <summary>
    /// For non-standard styles: The cleaned content with boilerplate removed.
    /// Null if the style is standard or has no custom content.
    /// </summary>
    public string? CleanedContent { get; init; }
}

/// <summary>
/// Analyzes inline styles for strict template matching.
/// Uses a whitelist approach: only exact known patterns are considered standard.
/// </summary>
internal sealed partial class StrictStyleAnalyzer
{
    // Known boilerplate CSS patterns (normalized: no whitespace, lowercase)
    private static readonly string[] BoilerplatePatterns =
    [
        "html,body{height:100%;}",
        "html,body{height:100%}",
        "body,html{height:100%;}",
        "body,html{height:100%}",
    ];

    /// <summary>
    /// Analyzes an inline style and returns detailed analysis result
    /// </summary>
    public StyleAnalysisResult Analyze(string cssContent)
    {
        if (string.IsNullOrWhiteSpace(cssContent))
        {
            return new StyleAnalysisResult { IsStandard = false, Description = "Empty style" };
        }

        // Parse CSS into rules
        var rules = ParseCssRules(cssContent);

        if (rules.Count == 0)
        {
            return new StyleAnalysisResult { IsStandard = false, Description = "No CSS rules found" };
        }

        // Check if ALL rules are boilerplate
        if (rules.All(r => IsBoilerplateRule(r.Normalized)))
        {
            return new StyleAnalysisResult { IsStandard = true, Description = "Standard boilerplate style" };
        }

        // Extract only custom rules
        var customRules = rules.Where(r => !IsBoilerplateRule(r.Normalized)).ToList();

        if (customRules.Count == 0)
        {
            return new StyleAnalysisResult { IsStandard = true, Description = "Standard boilerplate style" };
        }

        var cleanedContent = string.Join("\n\n", customRules.Select(r => r.Original)).Trim();

        return new StyleAnalysisResult
        {
            IsStandard = false,
            Description = "Style has custom content",
            CleanedContent = cleanedContent,
        };
    }

    private static bool IsBoilerplateRule(string normalizedRule)
    {
        return BoilerplatePatterns.Contains(normalizedRule);
    }

    private sealed record CssRule(string Original, string Normalized);

    private static List<CssRule> ParseCssRules(string css)
    {
        // Simple CSS rule parser: split on } and extract complete rules
        var rules = new List<CssRule>();
        var currentRule = new StringBuilder();
        var braceDepth = 0;

        foreach (var ch in css)
        {
            currentRule.Append(ch);

            if (ch == '{')
                braceDepth++;
            else if (ch == '}')
            {
                braceDepth--;
                if (braceDepth == 0)
                {
                    var rule = currentRule.ToString().Trim();
                    if (!string.IsNullOrWhiteSpace(rule))
                    {
                        var normalized = NormalizeRule(rule);
                        rules.Add(new CssRule(rule, normalized));
                    }
                    currentRule.Clear();
                }
            }
        }

        return rules;
    }

    private static string NormalizeRule(string rule)
    {
        return WhitespacePattern().Replace(rule, "").ToLowerInvariant();
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespacePattern();
}
