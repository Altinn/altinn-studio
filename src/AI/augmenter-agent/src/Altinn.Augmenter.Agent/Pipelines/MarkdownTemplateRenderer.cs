using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Altinn.Augmenter.Agent.Pipelines;

/// <summary>
/// Substitutes <c>{{path.to.field}}</c> placeholders in a Markdown template with
/// values pulled from a JsonDocument. Missing paths render as the literal token
/// to make it obvious in the output that the template references an unknown field.
/// Array iteration: <c>{{#each personer}}…{{/each}}</c> with <c>{{.field}}</c> for the item.
/// </summary>
public static partial class MarkdownTemplateRenderer
{
    public static string Render(string template, JsonDocument data)
    {
        // 1) Expand {{#each path}}…{{/each}} blocks first so inner placeholders run on each item
        var expanded = EachBlockPattern().Replace(template, match =>
        {
            var path = match.Groups["path"].Value;
            var body = match.Groups["body"].Value;
            if (!TryLookup(data.RootElement, path, out var arr) || arr.ValueKind != JsonValueKind.Array)
                return string.Empty;

            var sb = new StringBuilder();
            foreach (var item in arr.EnumerateArray())
            {
                sb.Append(RenderItem(body, item));
            }
            return sb.ToString();
        });

        // 2) Substitute top-level {{path}} placeholders
        return PlaceholderPattern().Replace(expanded, match =>
        {
            var path = match.Groups["path"].Value;
            if (TryLookup(data.RootElement, path, out var value))
                return FormatValue(value);
            return match.Value; // leave as-is so missing fields are visible
        });
    }

    private static string RenderItem(string body, JsonElement item)
    {
        return ItemPlaceholderPattern().Replace(body, match =>
        {
            var path = match.Groups["path"].Value;
            if (path == "") return FormatValue(item);
            if (TryLookup(item, path, out var value))
                return FormatValue(value);
            return match.Value;
        });
    }

    private static bool TryLookup(JsonElement root, string dottedPath, out JsonElement value)
    {
        value = root;
        foreach (var segment in dottedPath.Split('.'))
        {
            if (value.ValueKind != JsonValueKind.Object)
            {
                value = default;
                return false;
            }
            if (!value.TryGetProperty(segment, out var next))
            {
                value = default;
                return false;
            }
            value = next;
        }
        return true;
    }

    private static string FormatValue(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.String => value.GetString() ?? "",
        JsonValueKind.Number => value.ToString(),
        JsonValueKind.True   => "true",
        JsonValueKind.False  => "false",
        JsonValueKind.Null   => "",
        _                    => value.GetRawText(),
    };

    [GeneratedRegex(@"\{\{#each\s+(?<path>[\w\.]+)\}\}(?<body>.*?)\{\{/each\}\}", RegexOptions.Singleline)]
    private static partial Regex EachBlockPattern();

    [GeneratedRegex(@"\{\{\s*(?<path>[\w\.]+)\s*\}\}")]
    private static partial Regex PlaceholderPattern();

    [GeneratedRegex(@"\{\{\s*\.(?<path>[\w\.]*)\s*\}\}")]
    private static partial Regex ItemPlaceholderPattern();
}
