using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Rewrites legacy (moment.js style) Datepicker <c>format</c> values to the Unicode tokens v9
/// requires (e.g. <c>DD.MM.YYYY</c> → <c>dd.MM.yyyy</c>) under <c>App/ui/**/layouts</c>. The v8
/// frontend silently accepted the legacy tokens; v9 does not.
/// </summary>
internal static class DatepickerFormatMigration
{
    private const string ComponentType = "Datepicker";

    private static readonly IReadOnlyDictionary<string, string> _legacyFormats = new Dictionary<string, string>(
        StringComparer.Ordinal
    )
    {
        ["DD.MM.YYYY"] = "dd.MM.yyyy",
        ["DD/MM/YYYY"] = "dd/MM/yyyy",
        ["YYYY-MM-DD"] = "yyyy-MM-dd",
    };

    private static readonly IReadOnlyDictionary<string, Regex> _formatPatterns = _legacyFormats.Keys.ToDictionary(
        legacyFormat => legacyFormat,
        legacyFormat => new Regex(
            $"(\"format\"\\s*:\\s*)\"{Regex.Escape(legacyFormat)}\"",
            RegexOptions.Compiled | RegexOptions.CultureInvariant
        ),
        StringComparer.Ordinal
    );

    public static async Task<int> Migrate(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
        {
            await UpgradeConsole.Out.WriteLineAsync("No UI directory found, skipping Datepicker format migration");
            return 0;
        }

        var changedFiles = 0;
        var changedFormats = 0;
        foreach (var layoutFile in FindLayoutFiles(uiDirectory))
        {
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(layoutFile));
            var root = JsonNode.Parse(
                decoded.Text,
                new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (root is null)
                throw new JsonException($"Layout file does not contain JSON: {layoutFile}");

            var occurrences = CountLegacyFormats(root);
            if (occurrences.Values.Sum() == 0)
                continue;

            EnsureExpectedOccurrences(layoutFile, decoded.Text, occurrences);
            var migrated = decoded.Text;
            foreach (var (legacyFormat, newFormat) in _legacyFormats)
            {
                migrated = _formatPatterns[legacyFormat]
                    .Replace(migrated, match => match.Groups[1].Value + $"\"{newFormat}\"");
            }

            await Utf8TextFile.Write(layoutFile, migrated, decoded.HadBom);
            changedFiles++;
            changedFormats += occurrences.Values.Sum();
            await UpgradeConsole.Out.WriteLineAsync(
                $"Migrated {occurrences.Values.Sum()} legacy Datepicker format value(s) in {layoutFile}"
            );
        }

        await UpgradeConsole.Out.WriteLineAsync(
            changedFiles == 0
                ? "No legacy Datepicker format values found to migrate"
                : $"Migrated {changedFormats} legacy Datepicker format value(s) across {changedFiles} layout file(s)"
        );
        return 0;
    }

    private static string? ResolveUiDirectory(string projectFolder)
    {
        var appUiDirectory = Path.Combine(projectFolder, "App", "ui");
        if (Directory.Exists(appUiDirectory))
            return appUiDirectory;

        var uiDirectory = Path.Combine(projectFolder, "ui");
        return Directory.Exists(uiDirectory) ? uiDirectory : null;
    }

    private static IEnumerable<string> FindLayoutFiles(string uiDirectory) =>
        Directory
            .EnumerateFiles(uiDirectory, "*.json", SearchOption.AllDirectories)
            .Where(path =>
                string.Equals(Path.GetFileName(Path.GetDirectoryName(path)), "layouts", StringComparison.Ordinal)
            );

    private static Dictionary<string, int> CountLegacyFormats(JsonNode node)
    {
        var occurrences = _legacyFormats.Keys.ToDictionary(
            legacyFormat => legacyFormat,
            _ => 0,
            StringComparer.Ordinal
        );
        CountLegacyFormats(node, occurrences);
        return occurrences;
    }

    private static void CountLegacyFormats(JsonNode node, Dictionary<string, int> occurrences)
    {
        if (node is JsonObject obj)
        {
            if (
                obj["type"] is JsonValue type
                && type.TryGetValue<string>(out var componentType)
                && componentType == ComponentType
                && obj["format"] is JsonValue format
                && format.TryGetValue<string>(out var formatValue)
                && _legacyFormats.ContainsKey(formatValue)
            )
            {
                occurrences[formatValue]++;
            }

            foreach (var child in obj.Select(property => property.Value).ToList())
            {
                if (child is not null)
                    CountLegacyFormats(child, occurrences);
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.ToList())
            {
                if (child is not null)
                    CountLegacyFormats(child, occurrences);
            }
        }
    }

    private static void EnsureExpectedOccurrences(string layoutFile, string content, Dictionary<string, int> expected)
    {
        foreach (var (legacyFormat, expectedCount) in expected)
        {
            var textCount = _formatPatterns[legacyFormat].Count(content);
            if (textCount != expectedCount)
            {
                throw new InvalidOperationException(
                    $"Could not safely migrate {layoutFile}: the legacy format \"{legacyFormat}\" occurs outside "
                        + $"Datepicker format properties ({textCount} text vs {expectedCount} structural)"
                );
            }
        }
    }
}
