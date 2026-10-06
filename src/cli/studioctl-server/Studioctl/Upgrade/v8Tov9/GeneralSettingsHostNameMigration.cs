using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes <c>GeneralSettings:HostName</c> from the app's appsettings files. The platform sets it in every Altinn
/// environment and studioctl for a local run, both overriding the file, and the default is <c>local.altinn.cloud</c>,
/// so a value in the file only goes stale, often as the old localtest host <c>altinn3local.no</c>. The line is removed
/// in place to keep formatting and comments, and the edit is kept only when the file then holds the same
/// configuration without the key.
/// </summary>
internal static partial class GeneralSettingsHostNameMigration
{
    private static readonly JsonDocumentOptions _options = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    [GeneratedRegex("""^\s*"HostName"\s*:\s*"[^"]*"\s*(,?)\s*(//.*)?$""", RegexOptions.IgnoreCase)]
    private static partial Regex HostNameLine();

    public static async Task<MigrationResult> Migrate(string appFolder)
    {
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

            if (WithoutHostName(text) is not { } expected)
                continue;

            var name = Path.GetFileName(file);
            if (RemoveHostNameLine(text, expected) is { } migrated)
            {
                await Utf8TextFile.Write(file, migrated, hadBom);
                messages.Warn($"Removed GeneralSettings:HostName from {name}: the platform and studioctl set it.");
            }
            else
            {
                messages.Todo(
                    $"Remove GeneralSettings:HostName from {name}: the platform and studioctl set it, but it is not on "
                        + "a line of its own."
                );
            }
        }

        return new MigrationResult(messages);
    }

    /// <summary>The file's configuration without GeneralSettings:HostName, or null when it has no such key.</summary>
    private static JsonNode? WithoutHostName(string text)
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

        // Configuration keys are case-insensitive.
        var section =
            (root as JsonObject)
                ?.FirstOrDefault(p => p.Key.Equals("GeneralSettings", StringComparison.OrdinalIgnoreCase))
                .Value as JsonObject;
        var key = section
            ?.Select(p => p.Key)
            .FirstOrDefault(k => k.Equals("HostName", StringComparison.OrdinalIgnoreCase));
        if (section is null || key is null)
            return null;

        section.Remove(key);
        return root;
    }

    private static string? RemoveHostNameLine(string text, JsonNode expected)
    {
        var lines = text.Split('\n');
        for (var i = 0; i < lines.Length; i++)
        {
            var match = HostNameLine().Match(lines[i]);
            if (!match.Success)
                continue;

            var kept = lines.ToList();
            kept.RemoveAt(i);
            // Without a comma of its own the line closed its object, so the property before it loses its comma.
            var previous = i - 1;
            while (previous >= 0 && string.IsNullOrWhiteSpace(kept[previous]))
                previous--;
            if (match.Groups[1].Length == 0 && previous >= 0)
            {
                var content = kept[previous].TrimEnd();
                if (content.EndsWith(','))
                    kept[previous] = content[..^1] + kept[previous][content.Length..];
            }

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
