using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes a key with a scalar value from a section of the app's appsettings files. The line is removed in place to
/// keep formatting and comments, and the edit is kept only when the file then holds the same configuration without
/// the key. Section and key names are matched case-insensitively, as configuration keys are.
/// </summary>
internal static partial class AppSettingsKeyRemoval
{
    private static readonly JsonDocumentOptions _options = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
        // Fail the parse instead of the first lookup, which throws an ArgumentException rather than a JsonException.
        AllowDuplicateProperties = false,
    };

    [GeneratedRegex(@",(?=\s*(//.*)?$)")]
    private static partial Regex TrailingComma();

    /// <param name="appFolder">The folder with the app's appsettings files</param>
    /// <param name="section">The top-level section holding the key</param>
    /// <param name="key">The key to remove</param>
    /// <param name="removed">Reports a removal, given the file name and the value the key had</param>
    /// <param name="notRemoved">Reports a key that could not be removed automatically, given the file name</param>
    public static async Task<MigrationResult> Migrate(
        string appFolder,
        string section,
        string key,
        Action<List<UpgradeMessage>, string, JsonNode?> removed,
        Action<List<UpgradeMessage>, string> notRemoved
    )
    {
        var line = new Regex(
            $"""^\s*"{Regex.Escape(key)}"\s*:\s*("[^"]*"|true|false|null|-?[0-9][0-9.eE+-]*)\s*(,?)\s*(//.*)?$""",
            RegexOptions.IgnoreCase
        );
        var messages = new List<UpgradeMessage>();
        foreach (var file in Directory.EnumerateFiles(appFolder, "appsettings*.json").Order(StringComparer.Ordinal))
        {
            string text;
            bool hadBom;
            try
            {
                (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(file));
            }
            catch (DecoderFallbackException)
            {
                continue; // Not UTF-8, so not ours to rewrite.
            }

            if (Without(text, section, key) is not var (expected, value))
                continue;

            var name = Path.GetFileName(file);
            if (RemoveLine(text, line, expected) is { } migrated)
            {
                await Utf8TextFile.Write(file, migrated, hadBom);
                removed(messages, name, value);
            }
            else
            {
                notRemoved(messages, name);
            }
        }

        return new MigrationResult(messages);
    }

    /// <summary>The file's configuration without the key and the value it had, or null when it has no such key.</summary>
    private static (JsonNode? Expected, JsonNode? Value)? Without(string text, string sectionName, string keyName)
    {
        JsonNode? root;
        try
        {
            root = JsonNode.Parse(text, documentOptions: _options);
        }
        catch (JsonException)
        {
            return null;
        }

        var section =
            (root as JsonObject)
                ?.FirstOrDefault(p => p.Key.Equals(sectionName, StringComparison.OrdinalIgnoreCase))
                .Value as JsonObject;
        var key = section
            ?.Select(p => p.Key)
            .FirstOrDefault(k => k.Equals(keyName, StringComparison.OrdinalIgnoreCase));
        if (section is null || key is null)
            return null;

        var value = section[key];
        section.Remove(key);
        return (root, value);
    }

    private static string? RemoveLine(string text, Regex line, JsonNode? expected)
    {
        var lines = text.Split('\n');
        for (var i = 0; i < lines.Length; i++)
        {
            var match = line.Match(lines[i]);
            if (!match.Success)
                continue;

            var kept = lines.ToList();
            kept.RemoveAt(i);
            // Without a comma of its own the line closed its object, so the property before it loses its comma.
            var previous = i - 1;
            while (
                previous >= 0
                && (
                    string.IsNullOrWhiteSpace(kept[previous])
                    || kept[previous].TrimStart().StartsWith("//", StringComparison.Ordinal)
                )
            )
                previous--;
            if (match.Groups[2].Length == 0 && previous >= 0)
                kept[previous] = TrailingComma().Replace(kept[previous], "", 1);

            var candidate = string.Join('\n', kept);
            try
            {
                if (JsonNode.DeepEquals(JsonNode.Parse(candidate, documentOptions: _options), expected))
                    return candidate;
            }
            catch (JsonException)
            {
                // Not this line; try the next.
            }
        }

        return null;
    }
}
